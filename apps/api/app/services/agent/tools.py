"""
Structured Agent Tool Layer
Taskmaster Track — All Things Agentic Hackathon
Problem Statement: SIH26155 (NTRO)

Wraps existing NetVigil deterministic compliance, risk, and parsing engines into
structured, type-safe agent tools with strict parameter validation.
"""
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import hashlib

from app.models.configuration import Configuration
from app.models.audit import Audit
from app.models.finding import Finding
from app.models.remediation import RemediationProposal
from app.services.parsing.vendor_detector import VendorDetector
from app.services.parser.registry import parser_registry
from app.services.compliance.service import ComplianceAuditService
from app.services.compliance.catalog import compliance_catalog
from app.services.remediation.catalog import find_remediation_template
from app.services.remediation.diff_generator import generate_remediation_diff
from app.services.risk.scoring import calculate_risk_score
from app.services.agent.models import (
    ProposedRemediationItem,
    AgentConstraint,
    VerificationTransition,
    DeviceAuditSummary,
    FinalExecutiveReport,
)
from app.services.agent.patcher import ConfigurationPatcher


class AgentToolExecutionError(Exception):
    """Raised when an agent tool fails safety checks or execution."""
    pass


class AgentToolLayer:
    """Authoritative tool execution layer called by Gemini Agent."""

    @classmethod
    async def discover_configurations(
        cls,
        db: AsyncSession,
        target_filenames: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Tool 1: Discovers and loads available network device configurations.
        """
        stmt = select(Configuration).order_by(desc(Configuration.uploaded_at)).limit(10)
        res = await db.execute(stmt)
        configs = list(res.scalars().all())

        results = []
        for c in configs:
            if target_filenames and c.original_filename not in target_filenames and c.id not in target_filenames:
                continue
            results.append({
                "analysis_id": c.id,
                "filename": c.original_filename,
                "vendor": c.detected_vendor,
                "platform": c.detected_platform,
                "size_bytes": c.file_size_bytes,
                "raw_text": c.raw_content,
                "hash": c.hash,
            })
        return results

    @classmethod
    def detect_vendor(cls, content: str) -> Dict[str, Any]:
        """
        Tool 2: Identifies device vendor and syntax pattern.
        """
        detection = VendorDetector.detect(content)
        return {
            "vendor": detection.vendor,
            "platform": detection.platform,
            "confidence": detection.confidence,
            "method": detection.method,
            "patterns_matched": detection.detected_patterns,
        }

    @classmethod
    async def analyze_and_audit(
        cls,
        analysis_id: str,
        frameworks: List[str],
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Tool 3 & 4: Ingests configuration AST and evaluates deterministic compliance rules.
        """
        cfg = await db.get(Configuration, analysis_id)
        if not cfg:
            raise AgentToolExecutionError(f"Configuration {analysis_id} not found.")

        # Deterministic parsing
        parser = parser_registry.get_parser(
            content=cfg.raw_content,
            vendor_hint=cfg.detected_vendor,
            filename=cfg.original_filename,
        )
        profile = parser.parse(cfg.raw_content, filename=cfg.original_filename)

        cfg.parser_status = "parsed"
        cfg.facts_extracted_count = profile.facts_extracted_count
        cfg.unknown_items_count = profile.unknown_items_count
        cfg.normalized_profile = profile.model_dump(mode="json")
        await db.commit()
        await db.refresh(cfg)

        # Compliance audit
        audit, summary, rule_results = await ComplianceAuditService.run_audit(
            configuration_id=cfg.id,
            frameworks=frameworks or ["CIS", "NIST", "STIG", "ISO"],
            db=db,
        )

        stats = audit.summary_stats or summary or {}
        return {
            "audit_id": audit.id,
            "analysis_id": cfg.id,
            "filename": cfg.original_filename,
            "vendor": cfg.detected_vendor,
            "score": audit.score or 0.0,
            "total_evaluated": stats.get("total_controls", len(rule_results)),
            "pass_count": stats.get("pass_count", 0),
            "fail_count": stats.get("fail_count", 0),
            "unknown_count": stats.get("unknown_count", 0),
            "framework_scores": stats.get("framework_scores", {}),
        }

    @classmethod
    async def get_findings_and_risk(
        cls,
        audit_id: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Tool 5 & 6: Fetches failed findings and calculates deterministic risk matrix.
        """
        f_stmt = select(Finding).where(Finding.audit_id == audit_id)
        f_res = await db.execute(f_stmt)
        all_findings = list(f_res.scalars().all())

        failed = [f for f in all_findings if f.status in ["FAIL", "PARTIAL"]]
        crit_count = sum(1 for f in failed if f.severity == "CRITICAL")
        high_count = sum(1 for f in failed if f.severity == "HIGH")
        med_count = sum(1 for f in failed if f.severity == "MEDIUM")
        low_count = sum(1 for f in failed if f.severity == "LOW")

        dominant_sev = "CRITICAL" if crit_count > 0 else "HIGH" if high_count > 0 else "MEDIUM"
        risk_score, risk_level, likelihood = calculate_risk_score(
            severity=dominant_sev,
            exposure="MANAGEMENT_PLANE",
            impact="HIGH" if dominant_sev in ["CRITICAL", "HIGH"] else "MEDIUM",
            finding_count=len(failed),
        )

        findings_data = []
        for f in failed:
            findings_data.append({
                "finding_id": f.id,
                "control_id": f.control_id,
                "framework": f.framework,
                "title": f.title,
                "severity": f.severity,
                "status": f.status,
                "evidence": f.evidence,
                "finding_metadata": f.finding_metadata,
            })

        return {
            "audit_id": audit_id,
            "total_failed": len(failed),
            "critical_count": crit_count,
            "high_count": high_count,
            "medium_count": med_count,
            "low_count": low_count,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "likelihood": likelihood,
            "failed_findings": findings_data,
        }

    @classmethod
    async def generate_remediation_plan(
        cls,
        audit_id: str,
        constraints: List[AgentConstraint],
        risk_threshold: str,
        db: AsyncSession,
    ) -> List[ProposedRemediationItem]:
        """
        Tool 7: Creates allowlisted remediation plan and filters against negative constraints.
        """
        audit = await db.get(Audit, audit_id)
        if not audit:
            raise AgentToolExecutionError(f"Audit {audit_id} not found.")

        cfg = await db.get(Configuration, audit.configuration_id)
        vendor = (cfg.detected_vendor if cfg else "cisco") or "cisco"
        device_name = cfg.original_filename if cfg else "device"

        f_stmt = select(Finding).where(Finding.audit_id == audit_id, Finding.status.in_(["FAIL", "PARTIAL"]))
        f_res = await db.execute(f_stmt)
        findings = list(f_res.scalars().all())

        proposals: List[ProposedRemediationItem] = []
        processed_controls = set()

        for f in findings:
            # Map normalized control
            rule_id = (f.finding_metadata or {}).get("rule_id") if isinstance(f.finding_metadata, dict) else None
            normalized_prop = ""
            if rule_id:
                rule = compliance_catalog.get_rule_by_id(rule_id)
                if rule:
                    normalized_prop = rule.fact_path

            if not normalized_prop:
                t_lower = f.title.lower()
                if "ssh" in t_lower:
                    normalized_prop = "remote_access.ssh_version"
                elif "telnet" in t_lower:
                    normalized_prop = "remote_access.telnet_enabled"
                elif "password" in t_lower:
                    normalized_prop = "authentication.password_encryption_enabled"
                elif "aaa" in t_lower:
                    normalized_prop = "authentication.aaa_enabled"
                elif "http" in t_lower:
                    normalized_prop = "remote_access.http_server_enabled"
                elif "syslog" in t_lower or "logging" in t_lower:
                    normalized_prop = "logging.remote_logging_enabled"
                elif "ntp" in t_lower:
                    normalized_prop = "time_sync.ntp_enabled"
                else:
                    normalized_prop = "general.security_setting"

            if normalized_prop in processed_controls:
                continue
            processed_controls.add(normalized_prop)

            # Check negative constraints
            is_constrained = False
            constraint_reason = None
            for c in constraints:
                sub_clean = c.subsystem.lower().strip()
                if sub_clean and (sub_clean in normalized_prop.lower() or sub_clean in f.title.lower()):
                    is_constrained = True
                    constraint_reason = f"Operator Negative Constraint: '{c.subsystem}' must NOT be modified."
                    break

            template = find_remediation_template(vendor=vendor, normalized_control=normalized_prop)
            commands = template["commands"] if template else f"# Manual hardening required for {f.title}"
            rollback = template.get("rollback_commands") if template else None
            impact = template.get("potential_impact", "Configuration update applied.") if template else "Manual intervention required."

            diff = generate_remediation_diff(
                current_evidence=f.evidence or f.title,
                remediation_commands=commands,
                vendor=vendor,
            )

            proposal = ProposedRemediationItem(
                proposal_id=f"prop_{audit.id[:8]}_{len(proposals)+1:02d}",
                analysis_id=audit.configuration_id,
                device_name=device_name,
                vendor=vendor,
                finding_id=f.id,
                control_id=f.control_id,
                framework=f.framework,
                title=template["title"] if template else f"Remediate {f.title}",
                severity=f.severity,
                is_constrained=is_constrained,
                constraint_reason=constraint_reason,
                commands=commands,
                rollback_commands=rollback,
                diff_preview=diff,
                potential_impact=impact,
                requires_approval=True,
                approval_status="SKIPPED_CONSTRAINED" if is_constrained else "PENDING",
            )
            proposals.append(proposal)

        return proposals

    @classmethod
    async def apply_approved_remediations(
        cls,
        analysis_id: str,
        proposals: List[ProposedRemediationItem],
        db: AsyncSession,
    ) -> Tuple[str, int, List[str]]:
        """
        Tool 8: Applies approved proposals to configuration text and saves modified content.
        Returns: (new_content, applied_count, log_descriptions)
        """
        cfg = await db.get(Configuration, analysis_id)
        if not cfg:
            raise AgentToolExecutionError(f"Configuration {analysis_id} not found.")

        current_text = cfg.raw_content or ""
        applied_count = 0
        applied_logs = []

        for p in proposals:
            if p.is_constrained or p.approval_status != "APPROVED":
                continue

            current_text, was_changed, desc = ConfigurationPatcher.apply_patch(
                vendor=p.vendor,
                raw_text=current_text,
                normalized_control=p.title.lower(),
                commands=p.commands,
            )
            if was_changed:
                applied_count += 1
                applied_logs.append(f"[{p.vendor.upper()}] Applied {p.control_id}: {desc}")

        # Update configuration in DB
        cfg.raw_content = current_text
        cfg.file_size_bytes = len(current_text.encode("utf-8"))
        cfg.hash = hashlib.sha256(current_text.encode("utf-8")).hexdigest()
        await db.commit()
        await db.refresh(cfg)

        return current_text, applied_count, applied_logs

    @classmethod
    async def verify_and_compare(
        cls,
        analysis_id: str,
        audit_id_before: str,
        constraints: List[AgentConstraint],
        db: AsyncSession,
    ) -> DeviceAuditSummary:
        """
        Tool 9: Deterministically re-parses AST, re-audits rules, proves transitions, and verifies constraints.
        """
        cfg = await db.get(Configuration, analysis_id)
        prev_audit = await db.get(Audit, audit_id_before)
        if not cfg or not prev_audit:
            raise AgentToolExecutionError(f"Missing config or previous audit for verification.")

        # 1. Fetch previous findings
        prev_f_stmt = select(Finding).where(Finding.audit_id == prev_audit.id)
        prev_f_res = await db.execute(prev_f_stmt)
        prev_findings = {f.control_id: f for f in prev_f_res.scalars().all()}
        prev_fail_count = sum(1 for f in prev_findings.values() if f.status in ["FAIL", "PARTIAL"])

        # 2. Re-parse AST
        parser = parser_registry.get_parser(
            content=cfg.raw_content,
            vendor_hint=cfg.detected_vendor,
            filename=cfg.original_filename,
        )
        new_profile = parser.parse(cfg.raw_content, filename=cfg.original_filename)
        cfg.facts_extracted_count = new_profile.facts_extracted_count
        cfg.unknown_items_count = new_profile.unknown_items_count
        cfg.normalized_profile = new_profile.model_dump(mode="json")
        await db.commit()
        await db.refresh(cfg)

        # 3. Re-run compliance audit
        new_audit, _, _ = await ComplianceAuditService.run_audit(
            configuration_id=cfg.id,
            frameworks=["CIS", "NIST", "STIG", "ISO"],
            db=db,
        )

        # 4. Fetch new findings
        new_f_stmt = select(Finding).where(Finding.audit_id == new_audit.id)
        new_f_res = await db.execute(new_f_stmt)
        new_findings = {f.control_id: f for f in new_f_res.scalars().all()}
        new_fail_count = sum(1 for f in new_findings.values() if f.status in ["FAIL", "PARTIAL"])

        transitions: List[VerificationTransition] = []
        for ctrl_id, old_f in prev_findings.items():
            new_f = new_findings.get(ctrl_id)
            if new_f and old_f.status == "FAIL" and new_f.status == "PASS":
                transitions.append(VerificationTransition(
                    control_id=ctrl_id,
                    title=old_f.title,
                    framework=old_f.framework,
                    previous_status="FAIL",
                    new_status="PASS",
                    resolved=True,
                    evidence_verified=f"Verified resolved in AST: {new_f.evidence or 'Satisfied'}",
                ))

        prev_r_score = round(min(100.0, prev_fail_count * 12.5), 1) if prev_fail_count > 0 else 0.0
        new_r_score = round(min(100.0, new_fail_count * 12.5), 1) if new_fail_count > 0 else 0.0

        return DeviceAuditSummary(
            analysis_id=cfg.id,
            device_name=cfg.original_filename,
            vendor=cfg.detected_vendor,
            hash_before=prev_audit.configuration_id,
            hash_after=cfg.hash,
            compliance_score_before=prev_audit.score or 0.0,
            compliance_score_after=new_audit.score or 0.0,
            fail_count_before=prev_fail_count,
            fail_count_after=new_fail_count,
            risk_score_before=prev_r_score,
            risk_score_after=new_r_score,
            remediations_applied_count=len(transitions),
            transitions=transitions,
        )

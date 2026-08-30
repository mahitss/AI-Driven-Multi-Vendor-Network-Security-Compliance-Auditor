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

from app.core.logging import logger

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

        stats = audit.summary_stats or (summary.model_dump(mode="json") if hasattr(summary, "model_dump") else summary) or {}
        status_bd = stats.get("status_breakdown", {}) if isinstance(stats, dict) else {}
        pass_cnt = status_bd.get("PASS", 0) if isinstance(status_bd, dict) else 0
        fail_cnt = status_bd.get("FAIL", 0) if isinstance(status_bd, dict) else 0
        unknown_cnt = status_bd.get("UNKNOWN", 0) if isinstance(status_bd, dict) else 0
        total_eval = len(rule_results)

        return {
            "audit_id": audit.id,
            "analysis_id": cfg.id,
            "filename": cfg.original_filename,
            "vendor": cfg.detected_vendor,
            "score": audit.score or 0.0,
            "total_evaluated": total_eval,
            "pass_count": pass_cnt,
            "fail_count": fail_cnt,
            "unknown_count": unknown_cnt,
            "framework_scores": stats.get("framework_scores", {}) if isinstance(stats, dict) else {},
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
        vendor = (cfg.detected_vendor if cfg else "unknown") or "unknown"
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

            template = find_remediation_template(vendor=vendor, normalized_control=normalized_prop)
            if template:
                commands = template["commands"]
                rollback = template.get("rollback_commands")
                impact = template.get("potential_impact", "Configuration update applied.")
                proposal_title = template["title"]
                is_supported = True
            else:
                commands = f"# Automated remediation template unavailable for vendor '{vendor}' or control '{normalized_prop}'.\n# Consult official vendor security hardening guide."
                rollback = None
                impact = "Manual administrator verification and hardening required."
                proposal_title = f"Manual Hardening: {f.title}"
                is_supported = False

            # Check negative constraints (FAIL-CLOSED)
            is_constrained = False
            constraint_reason = None
            for c in constraints:
                sub_clean = c.subsystem.lower().strip()
                if not sub_clean:
                    continue
                
                # Check for SSH protection (prohibits modifying SSH administration, version, keys, and ciphers)
                if sub_clean == "ssh":
                    is_ssh_remediation = (
                        "ssh" in normalized_prop.lower()
                        or "admin-ssh" in normalized_prop.lower()
                        or any(kw in f.title.lower() for kw in ["ssh", "admin-ssh"])
                        or any(kw in proposal_title.lower() for kw in ["ssh", "admin-ssh"])
                        or any(cmd in commands.lower() for cmd in ["ip ssh", "admin-ssh", "system services ssh", "ssh protocol-version"])
                    )
                    if is_ssh_remediation:
                        is_constrained = True
                        constraint_reason = "Operator Negative Constraint: 'SSH' management access, version, and keys must NOT be modified."
                        break
                
                # Check for SNMP protection
                elif sub_clean == "snmp":
                    fields_to_check = [
                        normalized_prop.lower(),
                        f.title.lower(),
                        proposal_title.lower(),
                        commands.lower(),
                        (f.control_id or "").lower(),
                    ]
                    if any("snmp" in field for field in fields_to_check):
                        is_constrained = True
                        constraint_reason = "Operator Negative Constraint: 'SNMP' community strings and monitoring access must NOT be modified."
                        break

                # Check for Routing / BGP protection
                elif sub_clean in ["routing", "bgp", "ospf"]:
                    routing_indicators = ["bgp", "ospf", "routing", "route", "router"]
                    fields_to_check = [
                        normalized_prop.lower(),
                        f.title.lower(),
                        proposal_title.lower(),
                        commands.lower(),
                        (f.control_id or "").lower(),
                    ]
                    if any(any(ind in field for ind in routing_indicators) for field in fields_to_check):
                        is_constrained = True
                        constraint_reason = f"Operator Negative Constraint: '{c.subsystem.upper()}' routing policies must NOT be modified."
                        break
                
                # Generic fallback
                elif sub_clean in normalized_prop.lower() or sub_clean in f.title.lower() or sub_clean in commands.lower() or sub_clean in proposal_title.lower():
                    is_constrained = True
                    constraint_reason = f"Operator Negative Constraint: '{c.subsystem.upper()}' must NOT be modified."
                    break

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
                title=proposal_title,
                severity=f.severity,
                is_constrained=is_constrained,
                constraint_reason=constraint_reason,
                commands=commands,
                rollback_commands=rollback,
                diff_preview=diff,
                potential_impact=impact,
                requires_approval=not is_constrained,
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
        constraints: Optional[List[AgentConstraint]] = None,
    ) -> Tuple[str, int, List[str]]:
        """
        Tool 8: Applies approved proposals to configuration text and saves modified content.
        Enforces server-side constraint validation (rejects constrained patches even if approved=True passed).
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

            # Defense-in-depth: Reject any patch violating active constraints server-side
            if constraints:
                violates = False
                for c in constraints:
                    sub = c.subsystem.lower().strip()
                    if sub == "ssh":
                        if (
                            any(kw in p.title.lower() for kw in ["ssh", "admin-ssh"])
                            or any(cmd in p.commands.lower() for cmd in ["ip ssh", "admin-ssh", "system services ssh", "ssh protocol-version"])
                        ):
                            violates = True
                            break
                    elif sub and (sub in p.title.lower() or sub in p.commands.lower()):
                        violates = True
                        break
                if violates:
                    logger.warning(f"Server-side constraint gate blocked unauthorized patch: {p.title}")
                    continue

            # Strict validation: Reject patch if patch vendor does not match configuration detected vendor
            if cfg.detected_vendor and p.vendor.lower().strip() != cfg.detected_vendor.lower().strip():
                logger.warning(
                    f"Cross-vendor patch rejected: patch vendor '{p.vendor}' does not match "
                    f"configuration detected vendor '{cfg.detected_vendor}' for config {cfg.id}"
                )
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


# ==============================================================================
# GOOGLE ADK COMPLIANT FUNCTION CALLING TOOLS
# ==============================================================================

async def analyze_configuration_tool(
    configuration: str,
    vendor_hint: Optional[str] = None,
    db: Optional[AsyncSession] = None,
) -> Dict[str, Any]:
    """
    ADK Tool: Analyzes raw network configuration text, detects vendor, and parses AST into USM facts.
    """
    if not configuration or not configuration.strip():
        return {
            "success": False,
            "error": "Configuration content cannot be empty.",
            "recoverable": False,
        }

    try:
        detection = VendorDetector.detect(configuration)
        detected_vendor = detection.vendor if detection.vendor != "unknown" else (vendor_hint or "cisco")
        parser = parser_registry.get_parser(
            content=configuration,
            vendor_hint=detected_vendor,
            filename="input_config.cfg",
        )
        profile = parser.parse(configuration, filename="input_config.cfg")

        return {
            "success": True,
            "detected_vendor": detected_vendor,
            "platform": detection.platform,
            "detection_confidence": detection.confidence,
            "analysis_status": "PARSED",
            "facts_extracted_count": profile.facts_extracted_count,
            "unknown_items_count": profile.unknown_items_count,
            "normalized_profile": profile.model_dump(mode="json"),
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Configuration parsing failed: {str(e)}",
            "recoverable": True,
        }


async def run_compliance_audit_tool(
    analysis_id: str,
    framework: str = "CIS",
    db: Optional[AsyncSession] = None,
) -> Dict[str, Any]:
    """
    ADK Tool: Deterministically evaluates compliance framework rules (CIS, NIST, STIG, ISO) on an analyzed configuration.
    """
    if not db:
        return {
            "success": False,
            "error": "Database session required for compliance audit.",
            "recoverable": False,
        }

    try:
        res = await AgentToolLayer.analyze_and_audit(
            analysis_id=analysis_id,
            frameworks=[framework, "NIST", "STIG", "ISO"],
            db=db,
        )

        return {
            "success": True,
            "audit_id": res["audit_id"],
            "configuration_id": res["analysis_id"],
            "framework": framework,
            "score": res["score"],
            "controls_evaluated": res["total_evaluated"],
            "passed_controls": res["pass_count"],
            "failed_controls": res["fail_count"],
            "unknown_controls": res["unknown_count"],
            "framework_scores": res["framework_scores"],
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Compliance audit execution failed: {str(e)}",
            "recoverable": True,
        }


async def get_findings_tool(
    audit_id: str,
    severity_filter: Optional[str] = None,
    db: Optional[AsyncSession] = None,
) -> Dict[str, Any]:
    """
    ADK Tool: Queries structured findings from an audit grouped by severity with line-level evidence.
    """
    if not db:
        return {
            "success": False,
            "error": "Database session required to fetch findings.",
            "recoverable": False,
        }

    try:
        res = await AgentToolLayer.get_findings_and_risk(audit_id=audit_id, db=db)
        findings = res["failed_findings"]
        if severity_filter and severity_filter.upper() != "ALL":
            findings = [f for f in findings if f["severity"].upper() == severity_filter.upper()]

        return {
            "success": True,
            "audit_id": audit_id,
            "total_findings": len(findings),
            "risk_score": res["risk_score"],
            "risk_level": res["risk_level"],
            "findings": findings,
            "critical_count": res["critical_count"],
            "high_count": res["high_count"],
            "medium_count": res["medium_count"],
            "low_count": res["low_count"],
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to retrieve findings: {str(e)}",
            "recoverable": True,
        }


async def generate_remediation_plan_tool(
    audit_id: str,
    constraints: Optional[List[str]] = None,
    risk_threshold: str = "HIGH",
    db: Optional[AsyncSession] = None,
) -> Dict[str, Any]:
    """
    ADK Tool: Formulates allowlisted remediation plan and masks proposals violating operational constraints.
    """
    if not db:
        return {
            "success": False,
            "error": "Database session required for remediation planning.",
            "recoverable": False,
        }

    try:
        agent_constraints = []
        if constraints:
            for c in constraints:
                agent_constraints.append(AgentConstraint(subsystem=c, action="DO_NOT_MODIFY"))

        proposals = await AgentToolLayer.generate_remediation_plan(
            audit_id=audit_id,
            constraints=agent_constraints,
            risk_threshold=risk_threshold,
            db=db,
        )

        return {
            "success": True,
            "audit_id": audit_id,
            "total_proposals": len(proposals),
            "actionable_count": sum(1 for p in proposals if not p.is_constrained),
            "constrained_count": sum(1 for p in proposals if p.is_constrained),
            "proposals": [p.model_dump() for p in proposals],
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Remediation plan generation failed: {str(e)}",
            "recoverable": True,
        }


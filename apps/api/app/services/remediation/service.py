"""
Remediation Service Orchestrator
Problem Statement: SIH26155 (NTRO)

Generates, reviews, and serves vendor-specific configuration remediation proposals.
Strictly read-only previews & static templates — zero automatic execution.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.finding import Finding
from app.models.remediation import RemediationProposal
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.services.remediation.catalog import find_remediation_template
from app.services.remediation.diff_generator import generate_remediation_diff
from app.services.compliance.catalog import compliance_catalog
from app.core.errors import NotFoundError
from app.models.base import utc_now


class RemediationService:

    @classmethod
    async def generate_audit_remediations(
        cls,
        audit_id: str,
        db: AsyncSession,
        force_regenerate: bool = False,
    ) -> List[RemediationProposal]:
        """
        Generates vendor-specific remediation proposals for all failed findings of an audit.
        """
        audit = await db.get(Audit, audit_id)
        if not audit:
            raise NotFoundError(message=f"Audit {audit_id} not found.")

        # Check existing
        if not force_regenerate:
            existing_stmt = select(RemediationProposal).where(RemediationProposal.audit_id == audit_id)
            res = await db.execute(existing_stmt)
            existing = list(res.scalars().all())
            if existing:
                return existing

        # Fetch configuration to determine vendor
        cfg = await db.get(Configuration, audit.configuration_id)
        vendor = (cfg.detected_vendor if cfg else "unknown") or "unknown"
        platform = cfg.detected_platform if cfg else None

        # Fetch failed/partial findings
        findings_stmt = select(Finding).where(
            Finding.audit_id == audit_id,
            Finding.status.in_(["FAIL", "PARTIAL"])
        )
        f_res = await db.execute(findings_stmt)
        findings = list(f_res.scalars().all())

        # Clear old proposals if regenerating
        old_props_stmt = select(RemediationProposal).where(RemediationProposal.audit_id == audit_id)
        old_res = await db.execute(old_props_stmt)
        for p in old_res.scalars().all():
            await db.delete(p)
        await db.flush()

        created_proposals: List[RemediationProposal] = []
        processed_controls = set()

        for f in findings:
            # Resolve normalized target property
            rule_id = (f.finding_metadata or {}).get("rule_id") if isinstance(f.finding_metadata, dict) else None
            normalized_prop = ""
            if rule_id:
                rule = compliance_catalog.get_rule_by_id(rule_id)
                if rule:
                    normalized_prop = rule.fact_path

            if not normalized_prop:
                # Fallback mapping from control_id or title
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
                elif "finger" in t_lower:
                    normalized_prop = "services.finger_disabled"
                elif "proxy-arp" in t_lower or "proxy arp" in t_lower:
                    normalized_prop = "services.proxy_arp_disabled"
                elif "bpdu" in t_lower or "spanning" in t_lower:
                    normalized_prop = "network_security.spanning_tree_bpdu_guard_enabled"
                else:
                    normalized_prop = "unknown_control"

            # Avoid duplicate proposals for the same normalized control in an audit
            if normalized_prop in processed_controls and normalized_prop != "unknown_control":
                continue
            processed_controls.add(normalized_prop)

            template = find_remediation_template(vendor=vendor, normalized_control=normalized_prop)

            if template:
                diff = generate_remediation_diff(
                    current_evidence=f.evidence or f.title,
                    remediation_commands=template["commands"],
                    vendor=vendor,
                )

                proposal = RemediationProposal(
                    audit_id=audit_id,
                    finding_id=f.id,
                    vendor=vendor,
                    platform=platform,
                    normalized_control=normalized_prop,
                    title=template["title"],
                    status="AVAILABLE",
                    remediation_commands=template["commands"],
                    rollback_commands=template.get("rollback_commands"),
                    diff_preview=diff,
                    why_recommended=template["why_recommended"],
                    potential_impact=template["potential_impact"],
                    verification_steps=template["verification_steps"],
                    template_id=template["template_id"],
                    template_version=template.get("template_version", "1.0.0"),
                    confidence=template.get("confidence", 1.0),
                    is_reviewed=False,
                )
            else:
                # Safe unsupported handling
                proposal = RemediationProposal(
                    audit_id=audit_id,
                    finding_id=f.id,
                    vendor=vendor,
                    platform=platform,
                    normalized_control=normalized_prop,
                    title=f"Manual Hardening Required: {f.title}",
                    status="NOT_AVAILABLE",
                    remediation_commands=f"# Automated template unavailable for vendor '{vendor}' or control '{normalized_prop}'.\n# Consult official vendor security hardening guide.",
                    rollback_commands=None,
                    diff_preview={"diff_lines": [], "remove_count": 0, "add_count": 0, "preview_text": ""},
                    why_recommended=f"Non-compliant security baseline for {f.control_id}.",
                    potential_impact="Manual administrator verification required.",
                    verification_steps=f"Re-audit device configuration following manual modification.",
                    template_id="GENERIC-MANUAL-001",
                    template_version="1.0.0",
                    confidence=0.5,
                    is_reviewed=False,
                )

            db.add(proposal)
            created_proposals.append(proposal)

        await db.commit()
        for p in created_proposals:
            await db.refresh(p)

        return created_proposals

    @classmethod
    async def get_audit_remediations(
        cls,
        audit_id: str,
        db: AsyncSession,
        vendor: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[RemediationProposal]:
        """Retrieves remediation proposals for an audit."""
        stmt = select(RemediationProposal).where(RemediationProposal.audit_id == audit_id)

        if vendor and vendor != "ALL":
            stmt = stmt.where(RemediationProposal.vendor == vendor.lower())
        if status and status != "ALL":
            stmt = stmt.where(RemediationProposal.status == status.upper())

        stmt = stmt.order_by(desc(RemediationProposal.created_at))
        res = await db.execute(stmt)
        props = list(res.scalars().all())

        if not props and not (vendor or status):
            props = await cls.generate_audit_remediations(audit_id, db)

        return props

    @classmethod
    async def get_finding_remediation(cls, finding_id: str, db: AsyncSession) -> Optional[RemediationProposal]:
        """Gets remediation proposal attached to a specific finding."""
        stmt = select(RemediationProposal).where(RemediationProposal.finding_id == finding_id)
        res = await db.execute(stmt)
        return res.scalars().first()

    @classmethod
    async def review_remediation(
        cls,
        remediation_id: str,
        reviewer_email: str,
        db: AsyncSession,
    ) -> RemediationProposal:
        """Marks a remediation proposal as reviewed by a security administrator."""
        prop = await db.get(RemediationProposal, remediation_id)
        if not prop:
            raise NotFoundError(message=f"Remediation proposal {remediation_id} not found.")

        prop.is_reviewed = True
        prop.status = "REVIEWED"
        prop.reviewed_by = reviewer_email or "admin@ntro.gov.in"
        prop.reviewed_at = utc_now()

        await db.commit()
        await db.refresh(prop)
        return prop

    @classmethod
    async def get_remediation_summary_stats(cls, db: AsyncSession) -> Dict[str, Any]:
        """Calculates global remediation KPI statistics."""
        total_stmt = select(func.count(RemediationProposal.id))
        total_count = (await db.execute(total_stmt)).scalar() or 0

        available_stmt = select(func.count(RemediationProposal.id)).where(RemediationProposal.status == "AVAILABLE")
        available_count = (await db.execute(available_stmt)).scalar() or 0

        reviewed_stmt = select(func.count(RemediationProposal.id)).where(RemediationProposal.status == "REVIEWED")
        reviewed_count = (await db.execute(reviewed_stmt)).scalar() or 0

        not_avail_stmt = select(func.count(RemediationProposal.id)).where(RemediationProposal.status == "NOT_AVAILABLE")
        not_avail_count = (await db.execute(not_avail_stmt)).scalar() or 0

        return {
            "total_proposals": total_count,
            "available_count": available_count,
            "reviewed_count": reviewed_count,
            "not_available_count": not_avail_count,
        }

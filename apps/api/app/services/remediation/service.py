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
        user_id: Optional[str] = None,
    ) -> List[RemediationProposal]:
        """
        Generates vendor-specific remediation proposals for all failed findings of an audit with tenant isolation.
        """
        audit = await db.get(Audit, audit_id)
        if not audit:
            raise NotFoundError(message=f"Audit {audit_id} not found.")

        effective_user_id = user_id or getattr(audit, "user_id", "default_tenant") or "default_tenant"

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
                else:
                    normalized_prop = f"generic.{f.control_id}"

            # Deduplicate by normalized control for the same audit
            if normalized_prop in processed_controls:
                continue
            processed_controls.add(normalized_prop)

            template = find_remediation_template(vendor=vendor, normalized_control=normalized_prop)

            if template:
                diff = generate_remediation_diff(
                    original_config=cfg.raw_content if cfg else "",
                    remediation_commands=template["commands"],
                    vendor=vendor,
                )

                proposal = RemediationProposal(
                    user_id=effective_user_id,
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
                # Do not manufacture generic manual proposals when no authoritative catalog template exists
                continue

            db.add(proposal)
            created_proposals.append(proposal)

        # Record Stage 7 remediation completion in audit summary stats
        audit.summary_stats = {
            **(audit.summary_stats or {}),
            "remediation": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "proposals_count": len(created_proposals),
                "status": "complete",
            },
        }

        await db.commit()
        for p in created_proposals:
            await db.refresh(p)

        return created_proposals

    @classmethod
    def construct_remediated_config(
        cls,
        original_config: str,
        vendor: str,
        proposals: List[RemediationProposal],
    ) -> str:
        """
        Constructs safe remediated configuration text artifact by applying allowlisted patch transformations.
        Operates strictly locally / in-memory. Never modifies live network devices.
        """
        remediated = original_config
        v = (vendor or "cisco").lower()
        controls = {p.normalized_control for p in proposals}

        if v == "cisco":
            if "remote_access.ssh_version" in controls:
                if "ip ssh version 1" in remediated:
                    remediated = remediated.replace("ip ssh version 1", "ip ssh version 2")
                elif "ip ssh version 2" not in remediated:
                    remediated += "\nip ssh version 2\n"
            if "remote_access.telnet_enabled" in controls:
                if "transport input telnet" in remediated:
                    remediated = remediated.replace("transport input telnet", "transport input ssh")
                elif "transport input all" in remediated:
                    remediated = remediated.replace("transport input all", "transport input ssh")
                elif "transport input ssh" not in remediated:
                    remediated += "\nline vty 0 4\n transport input ssh\n"
            if "authentication.password_encryption_enabled" in controls:
                if "no service password-encryption" in remediated:
                    remediated = remediated.replace("no service password-encryption", "service password-encryption")
                elif "service password-encryption" not in remediated:
                    remediated += "\nservice password-encryption\n"
            if "authentication.aaa_enabled" in controls:
                if "no aaa new-model" in remediated:
                    remediated = remediated.replace("no aaa new-model", "aaa new-model")
                elif "aaa new-model" not in remediated:
                    remediated += "\naaa new-model\n"
            if "remote_access.http_server_enabled" in controls:
                if "ip http server" in remediated and "no ip http server" not in remediated:
                    remediated = remediated.replace("ip http server", "no ip http server")

        elif v == "juniper":
            lines = remediated.splitlines()
            new_lines = []
            for line in lines:
                stripped = line.strip()
                if "remote_access.telnet_enabled" in controls and ("system services telnet" in stripped or "services telnet" in stripped):
                    continue
                if "remote_access.http_server_enabled" in controls and ("web-management http" in stripped and "https" not in stripped):
                    continue
                if "remote_access.ssh_version" in controls and "protocol-version v1" in stripped:
                    line = line.replace("protocol-version v1", "protocol-version v2")
                new_lines.append(line)
            remediated = "\n".join(new_lines)
            if "remote_access.ssh_version" in controls and "protocol-version v2" not in remediated:
                remediated += "\nset system services ssh protocol-version v2\n"

        elif v == "fortinet":
            import re
            lines = remediated.splitlines()
            new_lines = []
            for line in lines:
                if "set allowaccess" in line:
                    if "remote_access.telnet_enabled" in controls:
                        line = re.sub(r'\btelnet\b', '', line)
                    if "remote_access.http_server_enabled" in controls:
                        line = re.sub(r'\bhttp\b', '', line)
                    line = re.sub(r'\s+', ' ', line).strip()
                    if line.startswith("set allowaccess"):
                        line = "    " + line
                new_lines.append(line)
            remediated = "\n".join(new_lines)

        return remediated

    @classmethod
    async def get_audit_remediations(
        cls,
        audit_id: str,
        db: AsyncSession,
        vendor: Optional[str] = None,
        status: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[RemediationProposal]:
        """Retrieves remediation proposals for an audit with tenant isolation."""
        stmt = select(RemediationProposal).where(RemediationProposal.audit_id == audit_id)
        if user_id:
            stmt = stmt.where(RemediationProposal.user_id == user_id)

        if vendor and vendor != "ALL":
            stmt = stmt.where(RemediationProposal.vendor == vendor.lower())
        if status and status != "ALL":
            stmt = stmt.where(RemediationProposal.status == status.upper())

        stmt = stmt.order_by(desc(RemediationProposal.created_at))
        res = await db.execute(stmt)
        props = list(res.scalars().all())

        if not props and not (vendor or status):
            props = await cls.generate_audit_remediations(audit_id, db, user_id=user_id)

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
        db: AsyncSession,
        reviewer_email: Optional[str] = None,
        reviewed_by: Optional[str] = None,
        status: Optional[str] = "REVIEWED",
        notes: Optional[str] = None,
    ) -> RemediationProposal:
        """Marks a remediation proposal as reviewed by a security administrator."""
        prop = await db.get(RemediationProposal, remediation_id)
        if not prop:
            raise NotFoundError(message=f"Remediation proposal {remediation_id} not found.")

        prop.is_reviewed = True
        prop.status = status or "REVIEWED"
        prop.reviewed_by = reviewed_by or reviewer_email or "admin@ntro.gov.in"
        prop.reviewed_at = utc_now()

        await db.commit()
        await db.refresh(prop)
        return prop

    @classmethod
    async def get_remediation_summary_stats(cls, db: AsyncSession, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Calculates global remediation KPI statistics with tenant isolation."""
        total_stmt = select(func.count(RemediationProposal.id))
        available_stmt = select(func.count(RemediationProposal.id)).where(RemediationProposal.status == "AVAILABLE")
        reviewed_stmt = select(func.count(RemediationProposal.id)).where(RemediationProposal.status == "REVIEWED")
        not_avail_stmt = select(func.count(RemediationProposal.id)).where(RemediationProposal.status == "NOT_AVAILABLE")

        if user_id:
            total_stmt = total_stmt.where(RemediationProposal.user_id == user_id)
            available_stmt = available_stmt.where(RemediationProposal.user_id == user_id)
            reviewed_stmt = reviewed_stmt.where(RemediationProposal.user_id == user_id)
            not_avail_stmt = not_avail_stmt.where(RemediationProposal.user_id == user_id)

        total_count = (await db.execute(total_stmt)).scalar() or 0
        available_count = (await db.execute(available_stmt)).scalar() or 0
        reviewed_count = (await db.execute(reviewed_stmt)).scalar() or 0
        not_avail_count = (await db.execute(not_avail_stmt)).scalar() or 0

        return {
            "total_proposals": total_count,
            "available_count": available_count,
            "reviewed_count": reviewed_count,
            "not_available_count": not_avail_count,
        }

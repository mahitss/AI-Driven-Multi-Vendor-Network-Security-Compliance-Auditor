"""
Risk Intelligence Service Orchestrator
Problem Statement: SIH26155 (NTRO)

Orchestrates risk computation, grouping, persistence, and graph retrieval.
"""
from typing import Any, Dict, List, Optional
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.finding import Finding
from app.models.risk import RiskItem
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.services.risk.grouper import group_findings_into_risks
from app.services.risk.graph import build_risk_graph
from app.core.errors import NotFoundError


class RiskIntelligenceService:

    @classmethod
    async def generate_audit_risks(
        cls,
        audit_id: str,
        db: AsyncSession,
        force_regenerate: bool = False,
    ) -> List[RiskItem]:
        """
        Analyzes findings for an audit, correlates into logical risks, and persists them.
        """
        # Check if audit exists
        audit = await db.get(Audit, audit_id)
        if not audit:
            raise NotFoundError(message=f"Audit {audit_id} not found.")

        # Check for existing risks if not forcing regeneration
        if not force_regenerate:
            existing_stmt = select(RiskItem).where(RiskItem.audit_id == audit_id).order_by(desc(RiskItem.risk_score))
            res = await db.execute(existing_stmt)
            existing = list(res.scalars().all())
            if existing:
                return existing

        # Fetch findings for the audit
        findings_stmt = select(Finding).where(Finding.audit_id == audit_id)
        f_res = await db.execute(findings_stmt)
        findings = list(f_res.scalars().all())

        device_id = audit.device_id
        if not device_id:
            cfg = await db.get(Configuration, audit.configuration_id)
            if cfg:
                device_id = cfg.device_id or cfg.original_filename

        # Correlate failed findings into risks
        risk_dicts = group_findings_into_risks(findings, audit_id=audit_id, device_id=device_id)

        # Remove old risks if any
        old_risks_stmt = select(RiskItem).where(RiskItem.audit_id == audit_id)
        old_res = await db.execute(old_risks_stmt)
        for r in old_res.scalars().all():
            await db.delete(r)
        await db.flush()

        # Create new RiskItem records
        created_risks: List[RiskItem] = []
        for rd in risk_dicts:
            item = RiskItem(**rd)
            db.add(item)
            created_risks.append(item)

        await db.commit()
        for item in created_risks:
            await db.refresh(item)

        return created_risks

    @classmethod
    async def get_audit_risks(
        cls,
        audit_id: str,
        db: AsyncSession,
        severity: Optional[str] = None,
        priority: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[RiskItem]:
        """Retrieves risks for an audit with optional filtering."""
        stmt = select(RiskItem).where(RiskItem.audit_id == audit_id)

        if severity and severity != "ALL":
            stmt = stmt.where(RiskItem.severity == severity.upper())
        if priority and priority != "ALL":
            stmt = stmt.where(RiskItem.priority == priority.upper())
        if category and category != "ALL":
            stmt = stmt.where(RiskItem.category == category)
        if status and status != "ALL":
            stmt = stmt.where(RiskItem.status == status.upper())

        stmt = stmt.order_by(desc(RiskItem.risk_score))
        res = await db.execute(stmt)
        risks = list(res.scalars().all())

        # If no risks exist yet, generate them dynamically
        if not risks and not (severity or priority or category or status):
            risks = await cls.generate_audit_risks(audit_id, db)

        return risks

    @classmethod
    async def get_risk_by_id(cls, risk_id: str, db: AsyncSession) -> RiskItem:
        """Retrieves a single risk item by ID."""
        item = await db.get(RiskItem, risk_id)
        if not item:
            raise NotFoundError(message=f"Risk item {risk_id} not found.")
        return item

    @classmethod
    async def get_risk_graph(cls, audit_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Builds and returns the interactive risk relationship graph for an audit."""
        risks = await cls.get_audit_risks(audit_id, db)

        findings_stmt = select(Finding).where(Finding.audit_id == audit_id)
        f_res = await db.execute(findings_stmt)
        findings = list(f_res.scalars().all())

        audit = await db.get(Audit, audit_id)
        device_label = "Gateway Router Asset"
        if audit:
            cfg = await db.get(Configuration, audit.configuration_id)
            if cfg:
                device_label = f"{cfg.original_filename} ({cfg.detected_vendor.upper()})"

        return build_risk_graph(risks, findings, device_label=device_label)

    @classmethod
    async def get_risk_summary_stats(cls, db: AsyncSession) -> Dict[str, Any]:
        """Calculates global risk intelligence KPI statistics."""
        # Total counts
        total_stmt = select(func.count(RiskItem.id))
        total_risks = (await db.execute(total_stmt)).scalar() or 0

        p0_stmt = select(func.count(RiskItem.id)).where(RiskItem.priority == "P0")
        p0_count = (await db.execute(p0_stmt)).scalar() or 0

        p1_stmt = select(func.count(RiskItem.id)).where(RiskItem.priority == "P1")
        p1_count = (await db.execute(p1_stmt)).scalar() or 0

        p2_stmt = select(func.count(RiskItem.id)).where(RiskItem.priority == "P2")
        p2_count = (await db.execute(p2_stmt)).scalar() or 0

        p3_stmt = select(func.count(RiskItem.id)).where(RiskItem.priority == "P3")
        p3_count = (await db.execute(p3_stmt)).scalar() or 0

        avg_score_stmt = select(func.avg(RiskItem.risk_score))
        avg_score = (await db.execute(avg_score_stmt)).scalar() or 0.0

        return {
            "total_risks": total_risks,
            "p0_count": p0_count,
            "p1_count": p1_count,
            "p2_count": p2_count,
            "p3_count": p3_count,
            "average_risk_score": round(float(avg_score), 1),
        }

"""
Risk Intelligence Service Orchestrator
Problem Statement: SIH26155 (NTRO)

Orchestrates risk computation, grouping, persistence, and graph retrieval.
"""
from typing import Any, Dict, List, Optional
from sqlalchemy import select, func, desc, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.finding import Finding
from app.models.risk import RiskItem
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.services.risk.grouper import group_findings_into_risks
from app.services.risk.graph import build_risk_graph
from app.core.errors import NotFoundError
from app.db.helpers import get_latest_audit_ids


class RiskIntelligenceService:

    @classmethod
    async def generate_audit_risks(
        cls,
        audit_id: str,
        db: AsyncSession,
        force_regenerate: bool = False,
        user_id: Optional[str] = None,
    ) -> List[RiskItem]:
        """
        Analyzes findings for an audit, correlates into logical risks, and persists them with tenant isolation.
        """
        # Check if audit exists
        audit = await db.get(Audit, audit_id)
        if not audit:
            raise NotFoundError(message=f"Audit {audit_id} not found.")

        effective_user_id = user_id or getattr(audit, "user_id", "default_tenant") or "default_tenant"

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

        # Create new RiskItem records with user_id
        created_risks: List[RiskItem] = []
        for rd in risk_dicts:
            item = RiskItem(user_id=effective_user_id, **rd)
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
        user_id: Optional[str] = None,
    ) -> List[RiskItem]:
        """Retrieves risks for an audit with optional filtering and tenant isolation."""
        stmt = select(RiskItem).where(RiskItem.audit_id == audit_id)
        if user_id:
            stmt = stmt.where(RiskItem.user_id == user_id)

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
            risks = await cls.generate_audit_risks(audit_id, db, user_id=user_id)

        return risks

    @classmethod
    async def get_risk_by_id(cls, risk_id: str, db: AsyncSession) -> RiskItem:
        """Retrieves a single risk item by ID."""
        item = await db.get(RiskItem, risk_id)
        if not item:
            raise NotFoundError(message=f"Risk item {risk_id} not found.")
        return item

    @classmethod
    async def get_risk_graph(
        cls,
        audit_id: Optional[str],
        db: AsyncSession,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Builds topological node-link graph payload for active security risks."""
        if not audit_id or audit_id.upper() == "ALL":
            latest_ids = await get_latest_audit_ids(db, user_id=user_id)
            if not latest_ids:
                return {"nodes": [], "edges": [], "summary": {"total_nodes": 0, "total_edges": 0, "critical_chains": 0}}
            audit_id = latest_ids[0]

        audit = await db.get(Audit, audit_id)
        if not audit or (user_id and audit.user_id != user_id):
            return {"nodes": [], "edges": [], "summary": {"total_nodes": 0, "total_edges": 0, "critical_chains": 0}}

        risks = await cls.get_audit_risks(audit_id, db, user_id=user_id)
        findings_stmt = select(Finding).where(Finding.audit_id == audit_id)
        if user_id:
            findings_stmt = findings_stmt.where(Finding.user_id == user_id)
        f_res = await db.execute(findings_stmt)
        findings = list(f_res.scalars().all())

        device_label = audit.device_id or f"Audit #{audit_id[:8]}"
        if audit.configuration_id:
            cfg = await db.get(Configuration, audit.configuration_id)
            if cfg:
                device_label = f"{cfg.original_filename} ({cfg.detected_vendor.upper()})"

        return build_risk_graph(risks, findings, device_label=device_label)

    @classmethod
    async def get_risk_summary_stats(cls, db: AsyncSession, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Calculates global risk intelligence KPI statistics across active fleet posture with tenant isolation."""
        latest_ids = await get_latest_audit_ids(db, user_id=user_id)

        if not latest_ids:
            return {
                "total_risks": 0,
                "p0_count": 0,
                "p1_count": 0,
                "p2_count": 0,
                "p3_count": 0,
                "average_risk_score": 0.0,
            }

        risk_stmt = (
            select(
                func.count(RiskItem.id).label("total"),
                func.sum(case((RiskItem.priority == "P0", 1), else_=0)).label("p0"),
                func.sum(case((RiskItem.priority == "P1", 1), else_=0)).label("p1"),
                func.sum(case((RiskItem.priority == "P2", 1), else_=0)).label("p2"),
                func.sum(case((RiskItem.priority == "P3", 1), else_=0)).label("p3"),
                func.avg(RiskItem.risk_score).label("avg_score"),
            )
            .where(RiskItem.audit_id.in_(latest_ids))
        )
        if user_id:
            risk_stmt = risk_stmt.where(RiskItem.user_id == user_id)
        res = (await db.execute(risk_stmt)).one()

        return {
            "total_risks": int(res.total or 0),
            "p0_count": int(res.p0 or 0),
            "p1_count": int(res.p1 or 0),
            "p2_count": int(res.p2 or 0),
            "p3_count": int(res.p3 or 0),
            "average_risk_score": round(float(res.avg_score or 0.0), 1),
        }

"""
Risk Intelligence REST API Endpoints
Problem Statement: SIH26155 (NTRO)
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from sqlalchemy import select, desc, func
from app.api.dependencies import DatabaseDep
from app.models.risk import RiskItem
from app.models.audit import Audit
from app.schemas.risk import RiskItemResponse, RiskGraphResponse, RiskSummaryStatsResponse
from app.services.risk.service import RiskIntelligenceService
from app.db.helpers import get_latest_audit_ids

router = APIRouter(tags=["Risk Intelligence"])


@router.get("/risks", response_model=List[RiskItemResponse])
async def list_risks(
    db: DatabaseDep,
    severity: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    audit_id: Optional[str] = Query(default=None),
    latest_only: bool = Query(default=True, description="Filter to risks from latest audit per configuration"),
    limit: int = Query(default=50, le=200),
):
    """Lists risk items across active fleet audits with multi-dimensional filtering."""
    stmt = select(RiskItem)

    if audit_id and audit_id.upper() != "ALL":
        stmt = stmt.where(RiskItem.audit_id == audit_id)
    elif latest_only:
        latest_audit_ids = await get_latest_audit_ids(db)
        if not latest_audit_ids:
            return []
        stmt = stmt.where(RiskItem.audit_id.in_(latest_audit_ids))

    if severity and severity != "ALL":
        stmt = stmt.where(RiskItem.severity == severity.upper())
    if priority and priority != "ALL":
        stmt = stmt.where(RiskItem.priority == priority.upper())
    if category and category != "ALL":
        stmt = stmt.where(RiskItem.category == category)
    if status and status != "ALL":
        stmt = stmt.where(RiskItem.status == status.upper())

    stmt = stmt.order_by(desc(RiskItem.risk_score)).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/risks/stats", response_model=RiskSummaryStatsResponse)
async def get_risk_stats(db: DatabaseDep):
    """Calculates global risk statistics and priority breakdown."""
    stats = await RiskIntelligenceService.get_risk_summary_stats(db)
    return RiskSummaryStatsResponse(**stats)


@router.get("/risks/{risk_id}", response_model=RiskItemResponse)
async def get_risk(risk_id: str, db: DatabaseDep):
    """Retrieves a specific risk item with contributing findings."""
    return await RiskIntelligenceService.get_risk_by_id(risk_id, db)


@router.get("/audits/{audit_id}/risks", response_model=List[RiskItemResponse])
async def get_audit_risks(
    audit_id: str,
    db: DatabaseDep,
    severity: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
):
    """Retrieves or dynamically computes correlated risks for a specific audit."""
    return await RiskIntelligenceService.get_audit_risks(
        audit_id=audit_id,
        db=db,
        severity=severity,
        priority=priority,
        category=category,
        status=status,
    )


@router.get("/audits/{audit_id}/risk-graph", response_model=RiskGraphResponse)
async def get_audit_risk_graph(audit_id: str, db: DatabaseDep):
    """Retrieves deterministic relationship graph connecting devices, exposures, risks, and findings."""
    graph_data = await RiskIntelligenceService.get_risk_graph(audit_id=audit_id, db=db)
    return RiskGraphResponse(**graph_data)

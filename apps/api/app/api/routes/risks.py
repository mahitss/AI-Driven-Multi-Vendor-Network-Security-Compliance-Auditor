"""
Risk Intelligence REST API Endpoints
Problem Statement: SIH26155 (NTRO)
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from sqlalchemy import select, desc, func
from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.models.risk import RiskItem
from app.models.audit import Audit
from app.schemas.risk import RiskItemResponse, RiskGraphResponse, RiskSummaryStatsResponse
from app.services.risk.service import RiskIntelligenceService
from app.db.helpers import get_latest_audit_ids
from app.core.errors import ResourceNotFoundError

router = APIRouter(tags=["Risk Intelligence"])


@router.get("/risks", response_model=List[RiskItemResponse])
async def list_risks(
    db: DatabaseDep,
    current_user: CurrentUserDep,
    severity: Optional[str] = Query(default=None, max_length=50),
    priority: Optional[str] = Query(default=None, max_length=50),
    category: Optional[str] = Query(default=None, max_length=100),
    status: Optional[str] = Query(default=None, max_length=50),
    audit_id: Optional[str] = Query(default=None, max_length=64),
    latest_only: bool = Query(default=True, description="Filter to risks from latest audit per configuration"),
    limit: int = Query(default=50, ge=1, le=200),
):
    """Lists risk items across active fleet audits for authenticated user with multi-dimensional filtering."""
    stmt = select(RiskItem).where(RiskItem.user_id == current_user.id)

    if audit_id and audit_id.upper() != "ALL":
        stmt = stmt.where(RiskItem.audit_id == audit_id)
    elif latest_only:
        latest_audit_ids = await get_latest_audit_ids(db, user_id=current_user.id)
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
async def get_risk_stats(db: DatabaseDep, current_user: CurrentUserDep):
    """Calculates risk statistics and priority breakdown scoped to current user."""
    stats = await RiskIntelligenceService.get_risk_summary_stats(db, user_id=current_user.id)
    return RiskSummaryStatsResponse(**stats)


@router.get("/risks/{risk_id}", response_model=RiskItemResponse)
async def get_risk(risk_id: str, db: DatabaseDep, current_user: CurrentUserDep):
    """Retrieves a specific risk item for the current user."""
    stmt = select(RiskItem).where(RiskItem.id == risk_id, RiskItem.user_id == current_user.id)
    risk = (await db.execute(stmt)).scalars().first()
    if not risk:
        raise ResourceNotFoundError(resource="RiskItem", identifier=risk_id)
    return risk


@router.get("/audits/{audit_id}/risks", response_model=List[RiskItemResponse])
async def get_audit_risks(
    audit_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
    severity: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
):
    """Retrieves or dynamically computes correlated risks for a specific audit owned by current user."""
    audit_stmt = select(Audit).where(Audit.id == audit_id, Audit.user_id == current_user.id)
    audit = (await db.execute(audit_stmt)).scalars().first()
    if not audit:
        raise ResourceNotFoundError(resource="Audit", identifier=audit_id)

    return await RiskIntelligenceService.get_audit_risks(
        audit_id=audit_id,
        db=db,
        user_id=current_user.id,
        severity=severity,
        priority=priority,
        category=category,
        status=status,
    )


@router.get("/audits/{audit_id}/risk-graph", response_model=RiskGraphResponse)
async def get_audit_risk_graph(audit_id: str, db: DatabaseDep, current_user: CurrentUserDep):
    """Retrieves deterministic relationship graph connecting devices, exposures, risks, and findings for user's audit."""
    audit_stmt = select(Audit).where(Audit.id == audit_id, Audit.user_id == current_user.id)
    audit = (await db.execute(audit_stmt)).scalars().first()
    if not audit:
        raise ResourceNotFoundError(resource="Audit", identifier=audit_id)

    graph_data = await RiskIntelligenceService.get_risk_graph(audit_id=audit_id, db=db, user_id=current_user.id)
    return RiskGraphResponse(**graph_data)

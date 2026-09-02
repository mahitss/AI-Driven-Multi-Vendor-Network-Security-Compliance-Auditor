"""
Compliance Audits & Findings API Routes
Problem Statement: SIH26155 (NTRO)
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import desc, select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.core.errors import ResourceNotFoundError, ValidationError
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.device import Device
from app.models.finding import Finding
from app.models.risk import RiskItem
from app.schemas.audit import (
    AuditDetailResponse,
    AuditResponse,
    AuditSummaryResponse,
    CreateAuditRequest,
    FindingResponse,
    LatestAuditResponse,
    SeverityStatsResponse,
)
from app.schemas.comparison import (
    AuditComparisonResponse,
    ComparableAuditPairItem,
)
from app.services.compliance.service import ComplianceAuditService
from app.services.comparison.service import SecurityTimeMachineService
from app.db.helpers import get_latest_audit_ids

router = APIRouter(prefix="/audits", tags=["Compliance Audits"])


@router.post(
    "",
    response_model=AuditSummaryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Execute multi-framework compliance audit against configuration",
)
async def create_audit(
    payload: CreateAuditRequest,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> AuditSummaryResponse:
    """
    Executes a deterministic compliance evaluation scoped to authenticated user:
    - Verifies configuration ownership
    - Evaluates rules across CIS, NIST, STIG, and ISO frameworks
    - Calculates reproducible compliance scores
    - Stores structured evidence findings under user_id
    - Returns audit executive summary
    """
    cfg_stmt = select(Configuration).where(Configuration.id == payload.configuration_id, Configuration.user_id == current_user.id)
    cfg = (await db.execute(cfg_stmt)).scalars().first()
    if not cfg:
        raise ResourceNotFoundError(resource="Configuration", identifier=payload.configuration_id)

    audit_rec, summary, _ = await ComplianceAuditService.run_audit(
        configuration_id=payload.configuration_id,
        frameworks=payload.frameworks,
        db=db,
        user_id=current_user.id,
    )

    framework_scores = {fw: score_obj.score for fw, score_obj in summary.framework_scores.items()}

    return AuditSummaryResponse(
        audit_id=audit_rec.id,
        configuration_id=audit_rec.configuration_id,
        overall_score=summary.overall_score,
        status=audit_rec.status,
        frameworks=framework_scores,
        summary=SeverityStatsResponse(
            critical=summary.severity_breakdown.critical,
            high=summary.severity_breakdown.high,
            medium=summary.severity_breakdown.medium,
            low=summary.severity_breakdown.low,
            info=summary.severity_breakdown.info,
        ),
        status_counts=summary.status_breakdown,
        completed_at=audit_rec.completed_at,
    )


@router.get(
    "",
    response_model=List[AuditResponse],
    summary="List all executed compliance audits",
)
async def list_audits(
    db: DatabaseDep,
    current_user: CurrentUserDep,
    configuration_id: Optional[str] = Query(None, description="Filter by configuration ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> List[AuditResponse]:
    """Retrieve audit history sessions ordered by creation date for current user."""
    query = (
        select(Audit)
        .where(Audit.user_id == current_user.id)
        .order_by(desc(Audit.created_at))
        .offset(offset)
        .limit(limit)
    )

    if configuration_id:
        query = query.where(Audit.configuration_id == configuration_id)

    res = await db.execute(query)
    audits = res.scalars().all()
    return audits


@router.get(
    "/latest",
    response_model=Optional[LatestAuditResponse],
    summary="Get latest audit summary for current authenticated user",
)
async def get_latest_user_audit(
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> Optional[LatestAuditResponse]:
    """Retrieve the single most recent completed audit execution and its findings summary for current user."""
    stmt = (
        select(Audit, Configuration)
        .outerjoin(Configuration, Audit.configuration_id == Configuration.id)
        .where(Audit.user_id == current_user.id)
        .order_by(desc(Audit.created_at), desc(Audit.id))
        .limit(1)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        return None

    audit, cfg = row
    findings_stmt = (
        select(
            func.count(Finding.id).label("total"),
            func.sum(case((Finding.status.in_(["FAIL", "PARTIAL"]), 1), else_=0)).label("open"),
            func.sum(case((Finding.status.in_(["FAIL", "PARTIAL"]) & (Finding.severity == "CRITICAL"), 1), else_=0)).label("critical"),
            func.sum(case((Finding.status.in_(["FAIL", "PARTIAL"]) & (Finding.severity == "HIGH"), 1), else_=0)).label("high"),
            func.sum(case((Finding.status.in_(["FAIL", "PARTIAL"]) & (Finding.severity == "MEDIUM"), 1), else_=0)).label("medium"),
            func.sum(case((Finding.status.in_(["FAIL", "PARTIAL"]) & (Finding.severity == "LOW"), 1), else_=0)).label("low"),
            func.sum(case((Finding.status.in_(["FAIL", "PARTIAL"]) & (Finding.severity == "INFO"), 1), else_=0)).label("info"),
        )
        .where(Finding.audit_id == audit.id, Finding.user_id == current_user.id)
    )
    f_res = (await db.execute(findings_stmt)).one()

    avg_risk_stmt = select(func.avg(RiskItem.risk_score)).where(RiskItem.audit_id == audit.id, RiskItem.user_id == current_user.id)
    risk_score = (await db.execute(avg_risk_stmt)).scalar()

    total_configs = (await db.execute(select(func.count(Configuration.id)).where(Configuration.user_id == current_user.id))).scalar() or 0
    total_devices = (await db.execute(select(func.count(Device.id)).where(Device.user_id == current_user.id))).scalar() or 0

    return LatestAuditResponse(
        audit_id=audit.id,
        configuration_id=audit.configuration_id,
        filename=cfg.original_filename if cfg else "configuration.cfg",
        sha256=cfg.hash if cfg else "",
        vendor=cfg.detected_vendor if cfg else "cisco",
        vendor_confidence=cfg.detection_confidence if cfg else 0.98,
        compliance_score=audit.score or 0.0,
        risk_score=round(float(risk_score), 1) if risk_score is not None else 0.0,
        critical_count=f_res.critical or 0,
        high_count=f_res.high or 0,
        medium_count=f_res.medium or 0,
        low_count=f_res.low or 0,
        info_count=f_res.info or 0,
        findings_count=f_res.total or 0,
        open_findings=f_res.open or 0,
        total_configurations=total_configs,
        total_devices=max(total_devices, total_configs),
        created_at=audit.created_at,
        completed_at=audit.completed_at,
    )


@router.get(
    "/findings/all",
    response_model=List[FindingResponse],
    summary="List all findings across audits",
)
async def list_all_findings(
    db: DatabaseDep,
    current_user: CurrentUserDep,
    framework: Optional[str] = Query(None, description="Filter by framework (CIS, NIST, STIG, ISO)"),
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (PASS, FAIL, UNKNOWN)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    audit_id: Optional[str] = Query(None, description="Filter by specific audit ID"),
    latest_only: bool = Query(True, description="Filter to findings from the latest audit per configuration"),
    limit: int = Query(500, ge=1, le=1000),
    offset: int = Query(0, ge=0),
) -> List[FindingResponse]:
    """Retrieve findings across audits with multi-dimensional filtering and active posture scoping for current user."""
    query = (
        select(
            Finding,
            Audit.configuration_id.label("cfg_id"),
            Configuration.original_filename.label("dev_name"),
            Configuration.detected_vendor.label("dev_vendor"),
        )
        .join(Audit, Finding.audit_id == Audit.id)
        .outerjoin(Configuration, Audit.configuration_id == Configuration.id)
        .where(Finding.user_id == current_user.id)
    )

    if audit_id and audit_id.upper() != "ALL":
        query = query.where(Finding.audit_id == audit_id)
    elif latest_only:
        latest_audit_ids = await get_latest_audit_ids(db, user_id=current_user.id)
        if not latest_audit_ids:
            return []
        query = query.where(Finding.audit_id.in_(latest_audit_ids))

    if framework and framework.upper() != "ALL":
        query = query.where(Finding.framework == framework.upper())
    if severity and severity.upper() != "ALL":
        query = query.where(Finding.severity == severity.upper())
    if status_filter and status_filter.upper() != "ALL":
        query = query.where(Finding.status == status_filter.upper())
    if category and category.lower() != "all":
        query = query.where(Finding.category == category)

    query = query.order_by(Finding.severity, Finding.control_id).offset(offset).limit(limit)
    res = await db.execute(query)
    rows = res.all()

    response_items: List[FindingResponse] = []
    for f, cfg_id, dev_name, dev_vendor in rows:
        item = FindingResponse.model_validate(f)
        item.configuration_id = cfg_id
        item.device_name = dev_name
        item.vendor = dev_vendor
        response_items.append(item)
    return response_items


@router.get(
    "/compare",
    response_model=AuditComparisonResponse,
    summary="Security Time Machine: Compare two completed audits deterministically",
)
async def compare_audits(
    before_id: str = Query(..., description="Baseline audit ID (before remediation)"),
    after_id: str = Query(..., description="Remediated audit ID (after remediation)"),
    db: DatabaseDep = None,
    current_user: CurrentUserDep = None,
) -> AuditComparisonResponse:
    """
    Security Time Machine v2.0 Delta Engine:
    - Compares compliance scores, risk metrics, and control verdict transitions
    - Produces line-level AST diff with finding annotations
    - Reconstructs security evolution timeline
    """
    # Verify both audits belong to the current user
    b_stmt = select(Audit).where(Audit.id == before_id, Audit.user_id == current_user.id)
    a_stmt = select(Audit).where(Audit.id == after_id, Audit.user_id == current_user.id)
    b_audit = (await db.execute(b_stmt)).scalars().first()
    a_audit = (await db.execute(a_stmt)).scalars().first()
    if not b_audit:
        raise ResourceNotFoundError(resource="Audit", identifier=before_id)
    if not a_audit:
        raise ResourceNotFoundError(resource="Audit", identifier=after_id)

    return await SecurityTimeMachineService.compare_audits(
        before_audit_id=before_id,
        after_audit_id=after_id,
        db=db,
    )


@router.get(
    "/comparable-pairs",
    response_model=List[ComparableAuditPairItem],
    summary="List candidate audit pairs available for Security Time Machine comparison",
)
async def list_comparable_pairs(
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> List[ComparableAuditPairItem]:
    """Retrieves configurations with multiple completed audits for instant comparison."""
    return await SecurityTimeMachineService.list_comparable_pairs(db=db, user_id=current_user.id)


@router.get(
    "/{audit_id}",
    response_model=AuditDetailResponse,
    summary="Get complete audit details, framework scores, and findings",
)
async def get_audit(
    audit_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> AuditDetailResponse:
    """Fetch complete audit record with framework breakdown and findings list for current user."""
    stmt = select(Audit).where(Audit.id == audit_id, Audit.user_id == current_user.id)
    res = await db.execute(stmt)
    audit_rec = res.scalars().first()

    if not audit_rec:
        raise ResourceNotFoundError(resource="Audit", identifier=audit_id)

    # Fetch associated findings
    findings_stmt = select(Finding).where(Finding.audit_id == audit_id, Finding.user_id == current_user.id).order_by(Finding.severity, Finding.control_id)
    findings_res = await db.execute(findings_stmt)
    findings = findings_res.scalars().all()

    summary_stats = audit_rec.summary_stats or {}
    fw_scores = summary_stats.get("framework_scores", {})
    sev_stats = summary_stats.get("severity_breakdown", {})
    status_counts = summary_stats.get("status_breakdown", {})

    return AuditDetailResponse(
        id=audit_rec.id,
        configuration_id=audit_rec.configuration_id,
        device_id=audit_rec.device_id,
        status=audit_rec.status,
        score=audit_rec.score,
        started_at=audit_rec.started_at,
        completed_at=audit_rec.completed_at,
        summary_stats=audit_rec.summary_stats,
        framework_scores=fw_scores,
        severity_breakdown=SeverityStatsResponse(**sev_stats) if sev_stats else SeverityStatsResponse(),
        status_breakdown=status_counts,
        findings=[FindingResponse.model_validate(f) for f in findings],
    )


from fastapi import Response
import json

@router.get(
    "/{audit_id}/export",
    summary="Export audit evaluation and findings as a downloadable file attachment",
)
async def export_audit_file(
    audit_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
    format: str = Query("json", pattern="^(json|csv)$"),
):
    """Returns audit results with Content-Disposition: attachment for native browser download."""
    stmt = select(Audit).where(Audit.id == audit_id, Audit.user_id == current_user.id)
    audit = (await db.execute(stmt)).scalars().first()
    if not audit:
        raise ResourceNotFoundError(resource="Audit", identifier=audit_id)

    cfg = await db.get(Configuration, audit.configuration_id) if audit.configuration_id else None
    findings = list((await db.execute(
        select(Finding).where(Finding.audit_id == audit.id, Finding.user_id == current_user.id).order_by(Finding.severity)
    )).scalars().all())

    device_name = (cfg.original_filename if cfg else f"audit_{audit_id[:8]}").replace(" ", "_")

    if format == "csv":
        filename = f"netvigil_audit_{device_name}.csv"
        import csv, io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["control_id", "title", "framework", "severity", "status", "description", "evidence", "remediation"])
        for f in findings:
            writer.writerow([f.control_id, f.title, f.framework, f.severity, f.status, f.description or "", f.evidence or "", f.remediation or ""])
        content = output.getvalue()
        media_type = "text/csv; charset=utf-8"
    else:
        filename = f"netvigil_audit_{device_name}.json"
        data = {
            "audit_id": audit.id,
            "configuration_id": audit.configuration_id,
            "score": audit.score,
            "status": audit.status,
            "created_at": str(audit.created_at),
            "device": cfg.original_filename if cfg else "unknown",
            "vendor": cfg.detected_vendor if cfg else "unknown",
            "summary_stats": audit.summary_stats,
            "findings": [
                {
                    "control_id": f.control_id,
                    "title": f.title,
                    "framework": f.framework,
                    "severity": f.severity,
                    "status": f.status,
                    "description": f.description,
                    "evidence": f.evidence,
                    "remediation": f.remediation,
                }
                for f in findings
            ],
        }
        content = json.dumps(data, indent=2, default=str)
        media_type = "application/json; charset=utf-8"

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get(
    "/{audit_id}/findings",
    response_model=List[FindingResponse],
    summary="Filter findings for an audit",
)
async def get_audit_findings(
    audit_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
    framework: Optional[str] = Query(None, description="Filter by framework (CIS, NIST, STIG, ISO)"),
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (PASS, FAIL, UNKNOWN)"),
    category: Optional[str] = Query(None, description="Filter by category"),
) -> List[FindingResponse]:
    """Retrieve granular findings with multi-dimensional filtering for current user."""
    audit_stmt = select(Audit).where(Audit.id == audit_id, Audit.user_id == current_user.id)
    audit = (await db.execute(audit_stmt)).scalars().first()
    if not audit:
        raise ResourceNotFoundError(resource="Audit", identifier=audit_id)

    query = (
        select(
            Finding,
            Audit.configuration_id.label("cfg_id"),
            Configuration.original_filename.label("dev_name"),
            Configuration.detected_vendor.label("dev_vendor"),
        )
        .join(Audit, Finding.audit_id == Audit.id)
        .outerjoin(Configuration, Audit.configuration_id == Configuration.id)
        .where(Finding.audit_id == audit_id, Finding.user_id == current_user.id)
    )

    if framework and framework.upper() != "ALL":
        query = query.where(Finding.framework == framework.upper())
    if severity and severity.upper() != "ALL":
        query = query.where(Finding.severity == severity.upper())
    if status_filter and status_filter.upper() != "ALL":
        query = query.where(Finding.status == status_filter.upper())
    if category and category.lower() != "all":
        query = query.where(Finding.category == category)

    query = query.order_by(Finding.severity, Finding.control_id)

    res = await db.execute(query)
    rows = res.all()

    response_items: List[FindingResponse] = []
    for f, cfg_id, dev_name, dev_vendor in rows:
        item = FindingResponse.model_validate(f)
        item.configuration_id = cfg_id
        item.device_name = dev_name
        item.vendor = dev_vendor
        response_items.append(item)
    return response_items


@router.get(
    "/{audit_id}/summary",
    response_model=AuditSummaryResponse,
    summary="Get executive compliance summary for an audit",
)
async def get_audit_summary(
    audit_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> AuditSummaryResponse:
    """Retrieve aggregated compliance posture metrics and framework comparisons for current user."""
    stmt = select(Audit).where(Audit.id == audit_id, Audit.user_id == current_user.id)
    res = await db.execute(stmt)
    audit_rec = res.scalars().first()

    if not audit_rec:
        raise ResourceNotFoundError(resource="Audit", identifier=audit_id)

    summary_stats = audit_rec.summary_stats or {}
    fw_scores_raw = summary_stats.get("framework_scores", {})
    fw_scores = {fw: data.get("score", 0.0) for fw, data in fw_scores_raw.items()}
    sev_stats = summary_stats.get("severity_breakdown", {})
    status_counts = summary_stats.get("status_breakdown", {})

    return AuditSummaryResponse(
        audit_id=audit_rec.id,
        configuration_id=audit_rec.configuration_id,
        overall_score=audit_rec.score or 0.0,
        status=audit_rec.status,
        frameworks=fw_scores,
        summary=SeverityStatsResponse(**sev_stats) if sev_stats else SeverityStatsResponse(),
        status_counts=status_counts,
        completed_at=audit_rec.completed_at,
    )

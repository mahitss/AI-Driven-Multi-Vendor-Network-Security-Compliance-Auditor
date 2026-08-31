"""
Remediation Engine REST API Endpoints
Problem Statement: SIH26155 (NTRO)
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query, Response
from sqlalchemy import select, desc
from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.models.remediation import RemediationProposal
from app.models.audit import Audit
from app.models.finding import Finding
from app.schemas.remediation import (
    RemediationProposalResponse,
    ReviewRemediationRequest,
    RemediationSummaryStatsResponse,
)
from app.services.remediation.service import RemediationService
from app.core.errors import NotFoundError, ResourceNotFoundError

router = APIRouter(tags=["Remediation Center"])


@router.get("/remediations", response_model=List[RemediationProposalResponse])
async def list_remediations(
    db: DatabaseDep,
    current_user: CurrentUserDep,
    vendor: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
):
    """Lists remediation proposals for the authenticated user with filtering."""
    stmt = select(RemediationProposal).where(RemediationProposal.user_id == current_user.id)
    if vendor and vendor != "ALL":
        stmt = stmt.where(RemediationProposal.vendor == vendor.lower())
    if status and status != "ALL":
        stmt = stmt.where(RemediationProposal.status == status.upper())

    stmt = stmt.order_by(desc(RemediationProposal.created_at)).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/remediations/stats", response_model=RemediationSummaryStatsResponse)
async def get_remediation_stats(db: DatabaseDep, current_user: CurrentUserDep):
    """Calculates remediation status metrics for current user."""
    stats = await RemediationService.get_remediation_summary_stats(db, user_id=current_user.id)
    return RemediationSummaryStatsResponse(**stats)


@router.get("/remediations/{remediation_id}/export", summary="Export remediation script as a downloadable file attachment")
async def export_remediation_script(
    remediation_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
):
    """Returns remediation commands script with Content-Disposition: attachment header for native browser download."""
    stmt = select(RemediationProposal).where(RemediationProposal.id == remediation_id, RemediationProposal.user_id == current_user.id)
    prop = (await db.execute(stmt)).scalars().first()
    if not prop:
        raise NotFoundError(message=f"Remediation proposal {remediation_id} not found.")

    vendor = str(prop.vendor or "cisco").lower()
    template_id = str(prop.template_id or "patch")
    ext = "set" if vendor == "juniper" else ("conf" if vendor == "fortinet" else "cfg")
    filename = f"remediation_{vendor}_{template_id}.{ext}"

    header = (
        f"! NetVigil Remediation Catalog Export\n"
        f"! Vendor: {vendor.upper()}\n"
        f"! Template: {template_id}\n"
        f"! Execution: READ-ONLY ADVISORY (MANUAL DEPLOYMENT ONLY)\n\n"
    )
    content = header + (prop.remediation_commands or "")

    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get("/remediations/{remediation_id}", response_model=RemediationProposalResponse)
async def get_remediation(remediation_id: str, db: DatabaseDep, current_user: CurrentUserDep):
    """Retrieves a specific remediation proposal by ID for current user."""
    stmt = select(RemediationProposal).where(RemediationProposal.id == remediation_id, RemediationProposal.user_id == current_user.id)
    prop = (await db.execute(stmt)).scalars().first()
    if not prop:
        raise NotFoundError(message=f"Remediation proposal {remediation_id} not found.")
    return prop


@router.get("/findings/{finding_id}/remediation", response_model=Optional[RemediationProposalResponse])
async def get_finding_remediation(finding_id: str, db: DatabaseDep, current_user: CurrentUserDep):
    """Retrieves remediation proposal associated with a specific finding owned by current user."""
    finding_stmt = select(Finding).where(Finding.id == finding_id, Finding.user_id == current_user.id)
    finding = (await db.execute(finding_stmt)).scalars().first()
    if not finding:
        raise ResourceNotFoundError(resource="Finding", identifier=finding_id)

    return await RemediationService.get_finding_remediation(finding_id, db)


@router.get("/audits/{audit_id}/remediations", response_model=List[RemediationProposalResponse])
async def get_audit_remediations(
    audit_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
    vendor: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
):
    """Retrieves or generates vendor-specific remediation proposals for an audit owned by current user."""
    audit_stmt = select(Audit).where(Audit.id == audit_id, Audit.user_id == current_user.id)
    audit = (await db.execute(audit_stmt)).scalars().first()
    if not audit:
        raise ResourceNotFoundError(resource="Audit", identifier=audit_id)

    return await RemediationService.get_audit_remediations(
        audit_id=audit_id,
        db=db,
        user_id=current_user.id,
        vendor=vendor,
        status=status,
    )


@router.post("/remediations/{remediation_id}/review", response_model=RemediationProposalResponse)
async def review_remediation(
    remediation_id: str,
    payload: ReviewRemediationRequest,
    db: DatabaseDep,
    current_user: CurrentUserDep,
):
    """Marks a remediation proposal as reviewed and approved by a security administrator."""
    stmt = select(RemediationProposal).where(RemediationProposal.id == remediation_id, RemediationProposal.user_id == current_user.id)
    prop = (await db.execute(stmt)).scalars().first()
    if not prop:
        raise NotFoundError(message=f"Remediation proposal {remediation_id} not found.")

    return await RemediationService.review_remediation(
        remediation_id=remediation_id,
        status=payload.status,
        reviewed_by=payload.reviewed_by or payload.reviewer_email or current_user.email or "Security Officer",
        notes=payload.notes,
        db=db,
    )

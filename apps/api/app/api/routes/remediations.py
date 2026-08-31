"""
Remediation Engine REST API Endpoints
Problem Statement: SIH26155 (NTRO)
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from sqlalchemy import select, desc
from app.api.dependencies import DatabaseDep
from app.models.remediation import RemediationProposal
from app.schemas.remediation import (
    RemediationProposalResponse,
    ReviewRemediationRequest,
    RemediationSummaryStatsResponse,
)
from app.services.remediation.service import RemediationService
from app.core.errors import NotFoundError

router = APIRouter(tags=["Remediation Center"])


@router.get("/remediations", response_model=List[RemediationProposalResponse])
async def list_remediations(
    db: DatabaseDep,
    vendor: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
):
    """Lists global remediation proposals with filtering."""
    stmt = select(RemediationProposal)
    if vendor and vendor != "ALL":
        stmt = stmt.where(RemediationProposal.vendor == vendor.lower())
    if status and status != "ALL":
        stmt = stmt.where(RemediationProposal.status == status.upper())

    stmt = stmt.order_by(desc(RemediationProposal.created_at)).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/remediations/stats", response_model=RemediationSummaryStatsResponse)
async def get_remediation_stats(db: DatabaseDep):
    """Calculates global remediation status metrics."""
    stats = await RemediationService.get_remediation_summary_stats(db)
    return RemediationSummaryStatsResponse(**stats)


from fastapi import APIRouter, Query, Response

@router.get("/remediations/{remediation_id}/export", summary="Export remediation script as a downloadable file attachment")
async def export_remediation_script(
    remediation_id: str,
    db: DatabaseDep,
):
    """Returns remediation commands script with Content-Disposition: attachment header for native browser download."""
    prop = await db.get(RemediationProposal, remediation_id)
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
async def get_remediation(remediation_id: str, db: DatabaseDep):
    """Retrieves a specific remediation proposal by ID."""
    prop = await db.get(RemediationProposal, remediation_id)
    if not prop:
        raise NotFoundError(message=f"Remediation proposal {remediation_id} not found.")
    return prop


@router.get("/findings/{finding_id}/remediation", response_model=Optional[RemediationProposalResponse])
async def get_finding_remediation(finding_id: str, db: DatabaseDep):
    """Retrieves remediation proposal associated with a specific finding."""
    return await RemediationService.get_finding_remediation(finding_id, db)


@router.get("/audits/{audit_id}/remediations", response_model=List[RemediationProposalResponse])
async def get_audit_remediations(
    audit_id: str,
    db: DatabaseDep,
    vendor: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
):
    """Retrieves or generates vendor-specific remediation proposals for an audit."""
    return await RemediationService.get_audit_remediations(
        audit_id=audit_id,
        db=db,
        vendor=vendor,
        status=status,
    )


@router.post("/remediations/{remediation_id}/review", response_model=RemediationProposalResponse)
async def review_remediation(
    remediation_id: str,
    payload: ReviewRemediationRequest,
    db: DatabaseDep,
):
    """Marks a remediation proposal as reviewed and approved by a security administrator."""
    return await RemediationService.review_remediation(
        remediation_id=remediation_id,
        reviewer_email=payload.reviewer_email or "admin@ntro.gov.in",
        db=db,
    )

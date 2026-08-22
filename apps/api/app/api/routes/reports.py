"""
Compliance & Security Reports REST API Endpoints
Problem Statement: SIH26155 (NTRO)
"""
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Query, status
from pydantic import BaseModel
from sqlalchemy import select, desc
from app.api.dependencies import DatabaseDep
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.finding import Finding
from app.models.risk import RiskItem
from app.models.remediation import RemediationProposal
from app.core.errors import NotFoundError

router = APIRouter(prefix="/reports", tags=["Reports"])

# In-memory session reports storage for persistent generation in current session
GENERATED_REPORTS: List[Dict[str, Any]] = []


class GenerateReportRequest(BaseModel):
    report_type: str = "EXECUTIVE_AUDIT_SUMMARY"  # EXECUTIVE_AUDIT_SUMMARY, DEVICE_COMPLIANCE, REMEDIATION_PLAN
    audit_id: Optional[str] = None
    device_id: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None


@router.get("", summary="List all generated security audit reports")
async def list_reports() -> List[Dict[str, Any]]:
    """Returns list of generated compliance and remediation reports."""
    return GENERATED_REPORTS


@router.post("/generate", summary="Generate a new compliance audit report", status_code=status.HTTP_201_CREATED)
async def generate_report(
    payload: GenerateReportRequest,
    db: DatabaseDep,
) -> Dict[str, Any]:
    """Generates structured report document for executive review or technical remediation."""
    report_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Target Audit
    audit = None
    if payload.audit_id:
        audit = await db.get(Audit, payload.audit_id)
    if not audit:
        # Get latest audit
        audit = (await db.execute(select(Audit).order_by(desc(Audit.created_at)))).scalars().first()

    if not audit:
        raise NotFoundError(message="No audit session available to generate report.")

    cfg = await db.get(Configuration, audit.configuration_id) if audit.configuration_id else None
    target_device = cfg.original_filename if cfg else "Network Gateway Asset"

    # Findings
    findings_stmt = select(Finding).where(Finding.audit_id == audit.id).order_by(Finding.severity)
    findings = list((await db.execute(findings_stmt)).scalars().all())

    # Risks
    risks_stmt = select(RiskItem).where(RiskItem.audit_id == audit.id).order_by(desc(RiskItem.risk_score))
    risks = list((await db.execute(risks_stmt)).scalars().all())

    # Remediations
    rems_stmt = select(RemediationProposal).where(RemediationProposal.audit_id == audit.id)
    rems = list((await db.execute(rems_stmt)).scalars().all())

    # Build report sections
    sections = {
        "executive_summary": {
            "title": "Executive Compliance & Risk Summary",
            "overall_score": audit.score or 0,
            "status": "HARDENED" if (audit.score or 0) >= 80 else "NEEDS_ATTENTION",
            "evaluated_frameworks": list(audit.summary_stats.get("framework_scores", {}).keys()) if isinstance(audit.summary_stats, dict) else ["CIS", "NIST", "STIG", "ISO"],
            "total_controls_evaluated": len(findings),
            "open_findings_count": sum(1 for f in findings if f.status in ["FAIL", "PARTIAL"]),
            "critical_findings_count": sum(1 for f in findings if f.severity == "CRITICAL" and f.status in ["FAIL", "PARTIAL"]),
        },
        "framework_breakdown": audit.summary_stats.get("framework_scores", {}) if isinstance(audit.summary_stats, dict) else {},
        "top_risks": [
            {
                "title": r.title,
                "score": r.risk_score,
                "priority": r.priority,
                "category": r.category,
                "description": r.description,
            }
            for r in risks[:5]
        ],
        "critical_findings": [
            {
                "framework": f.framework,
                "control_id": f.control_id,
                "title": f.title,
                "severity": f.severity,
                "evidence": f.evidence,
                "remediation": f.remediation,
            }
            for f in findings if f.severity in ["CRITICAL", "HIGH"] and f.status in ["FAIL", "PARTIAL"]
        ],
        "remediation_action_items": [
            {
                "vendor": rm.vendor,
                "control": rm.normalized_control,
                "title": rm.title,
                "commands": rm.remediation_commands,
                "status": rm.status,
            }
            for rm in rems[:5]
        ],
    }

    report_record = {
        "id": report_id,
        "report_type": payload.report_type,
        "title": payload.title or f"{payload.report_type.replace('_', ' ').title()}: {target_device}",
        "target_device": target_device,
        "audit_id": audit.id,
        "compliance_score": audit.score or 0,
        "status": "COMPLETED",
        "created_at": now,
        "sections": sections,
        "notes": payload.notes or "Official compliance assessment document generated by NetVigil.",
    }

    GENERATED_REPORTS.insert(0, report_record)
    return report_record


@router.get("/{report_id}", summary="Get full report document details")
async def get_report_detail(report_id: str) -> Dict[str, Any]:
    """Retrieves full report content and sections."""
    report = next((r for r in GENERATED_REPORTS if r["id"] == report_id), None)
    if not report:
        raise NotFoundError(message=f"Report {report_id} not found.")
    return report

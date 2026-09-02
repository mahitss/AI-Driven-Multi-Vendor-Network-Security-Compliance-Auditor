"""
Compliance & Security Reports REST API Endpoints
Problem Statement: SIH26155 (NTRO)
"""
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, desc, or_
from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.core.auth import AuthenticatedUser
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.finding import Finding
from app.models.risk import RiskItem
from app.models.remediation import RemediationProposal
from app.core.errors import NotFoundError, ResourceNotFoundError, ValidationError
from app.core.security import redact_sensitive_data
import hashlib
from app.services.risk.scoring import calculate_risk_score

router = APIRouter(prefix="/reports", tags=["Reports"])

# In-memory session reports storage for persistent generation in current session
GENERATED_REPORTS: List[Dict[str, Any]] = []


class GenerateReportRequest(BaseModel):
    report_type: str = Field(default="EXECUTIVE_AUDIT_SUMMARY", max_length=50)  # EXECUTIVE_AUDIT_SUMMARY, DEVICE_COMPLIANCE, REMEDIATION_PLAN
    audit_id: Optional[str] = Field(default=None, max_length=64)
    baseline_audit_id: Optional[str] = Field(default=None, max_length=64)
    device_id: Optional[str] = Field(default=None, max_length=64)
    title: Optional[str] = Field(default=None, max_length=200)
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("report_type")
    @classmethod
    def validate_report_type(cls, v: str) -> str:
        allowed = {"EXECUTIVE_AUDIT_SUMMARY", "DEVICE_COMPLIANCE", "REMEDIATION_PLAN", "AUDIT_COMPARISON"}
        if v.upper() not in allowed:
            raise ValueError(f"Invalid report type '{v}'. Allowed: {', '.join(sorted(allowed))}")
        return v.upper()


class CompareAuditsRequest(BaseModel):
    baseline_audit_id: str = Field(..., min_length=1, max_length=64)
    remediated_audit_id: str = Field(..., min_length=1, max_length=64)


@router.get("", summary="List all generated security audit reports")
async def list_reports(current_user: CurrentUserDep) -> List[Dict[str, Any]]:
    """Returns list of generated compliance and remediation reports for current user."""
    return [r for r in GENERATED_REPORTS if r.get("user_id") == current_user.id]


@router.post("/generate", summary="Generate a new compliance audit report", status_code=status.HTTP_201_CREATED)
async def generate_report(
    payload: GenerateReportRequest,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> Dict[str, Any]:
    """Generates structured report document for executive review or technical remediation for current user."""
    effective_user = current_user
    report_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Target Audit
    audit = None
    if payload.audit_id:
        audit_stmt = select(Audit).where(Audit.id == payload.audit_id, Audit.user_id == effective_user.id)
        audit = (await db.execute(audit_stmt)).scalars().first()
    if not audit:
        # Get latest audit for current user
        audit_stmt = select(Audit).where(Audit.user_id == effective_user.id).order_by(desc(Audit.created_at))
        audit = (await db.execute(audit_stmt)).scalars().first()

    if not audit:
        raise NotFoundError(message="No audit session available to generate report.")

    cfg_stmt = select(Configuration).where(Configuration.id == audit.configuration_id, Configuration.user_id == effective_user.id)
    cfg = (await db.execute(cfg_stmt)).scalars().first() if audit.configuration_id else None
    target_device = cfg.original_filename if cfg else "Network Gateway Asset"

    # Findings
    findings_stmt = select(Finding).where(Finding.audit_id == audit.id, Finding.user_id == effective_user.id).order_by(Finding.severity)
    findings = list((await db.execute(findings_stmt)).scalars().all())

    # Risks
    risks_stmt = select(RiskItem).where(RiskItem.audit_id == audit.id, RiskItem.user_id == effective_user.id).order_by(desc(RiskItem.risk_score))
    risks = list((await db.execute(risks_stmt)).scalars().all())

    # Remediations
    rems_stmt = select(RemediationProposal).where(RemediationProposal.audit_id == audit.id, RemediationProposal.user_id == effective_user.id)
    rems = list((await db.execute(rems_stmt)).scalars().all())

    # Audit Identity
    cfg_raw = cfg.raw_content if (cfg and cfg.raw_content) else ""
    real_sha = cfg.hash if (cfg and cfg.hash) else (hashlib.sha256(cfg_raw.encode("utf-8")).hexdigest() if cfg_raw else (audit.id or "sha256_uncalculated"))
    line_count = len(cfg_raw.splitlines()) if cfg_raw else 0

    audit_identity = {
        "audit_id": audit.id,
        "configuration_id": audit.configuration_id,
        "filename": cfg.original_filename if cfg else "configuration.cfg",
        "vendor": cfg.detected_vendor if cfg else "cisco",
        "platform": cfg.detected_platform or "ios",
        "sha256": real_sha,
        "parser_version": "v1.0.0",
        "audit_timestamp": audit.created_at or now,
        "line_count": line_count,
    }

    # Security Posture Metrics
    summary_stats = audit.summary_stats if isinstance(audit.summary_stats, dict) else {}
    passed_count = sum(1 for f in findings if f.status == "PASS")
    failed_count = sum(1 for f in findings if f.status in ["FAIL", "PARTIAL"])
    unknown_count = sum(1 for f in findings if f.status == "UNKNOWN")
    total_evaluated = len(findings)

    # Calculate real risk from fail findings if risks table not populated
    crit_count = sum(1 for f in findings if (f.severity or "").upper() == "CRITICAL" and f.status in ["FAIL", "PARTIAL"])
    high_count = sum(1 for f in findings if (f.severity or "").upper() == "HIGH" and f.status in ["FAIL", "PARTIAL"])
    med_count = sum(1 for f in findings if (f.severity or "").upper() == "MEDIUM" and f.status in ["FAIL", "PARTIAL"])
    low_count = sum(1 for f in findings if (f.severity or "").upper() == "LOW" and f.status in ["FAIL", "PARTIAL"])

    if len(risks) > 0:
        risk_score = risks[0].risk_score or 0.0
        risk_priority = risks[0].priority or ("P0" if risk_score >= 80 else "P1" if risk_score >= 50 else "P2")
    elif failed_count > 0:
        dominant_sev = "CRITICAL" if crit_count > 0 else "HIGH" if high_count > 0 else "MEDIUM"
        risk_score, risk_priority, _ = calculate_risk_score(
            severity=dominant_sev,
            exposure="MANAGEMENT_PLANE",
            impact="HIGH" if dominant_sev in ["CRITICAL", "HIGH"] else "MEDIUM",
            finding_count=failed_count,
        )
    else:
        risk_score, risk_priority = 0.0, "P3"

    comp_score = float(audit.score) if audit.score is not None else (round((passed_count / total_evaluated) * 100, 1) if total_evaluated > 0 else 0.0)

    security_posture = {
        "compliance_score": comp_score,
        "risk_score": risk_score,
        "risk_priority": risk_priority,
        "likelihood": 0.85 if risk_score > 70 else 0.45,
        "impact": 0.90 if risk_score > 70 else 0.50,
        "total_controls_evaluated": total_evaluated,
        "passed_controls": passed_count,
        "failed_controls": failed_count,
        "unknown_controls": unknown_count,
        "status": "HARDENED" if comp_score >= 80 else "NEEDS_ATTENTION",
    }

    # Findings Breakdown
    findings_summary = {
        "total_findings": failed_count,
        "critical": crit_count,
        "high": high_count,
        "medium": med_count,
        "low": low_count,
        "top_failed_controls": [
            f.control_id for f in findings if f.status in ["FAIL", "PARTIAL"] and f.severity in ["CRITICAL", "HIGH"]
        ][:8],
    }

    # Real Framework Coverage
    fw_scores = summary_stats.get("framework_scores", {})
    framework_coverage = {}
    for fw in ["CIS", "NIST", "STIG", "ISO"]:
        fw_findings = [f for f in findings if (f.framework or "").upper() == fw]
        fw_pass = sum(1 for f in fw_findings if f.status == "PASS")
        fw_fail = sum(1 for f in fw_findings if f.status in ["FAIL", "PARTIAL"])
        fw_tot = len(fw_findings)
        fw_pct = round((fw_pass / fw_tot) * 100, 1) if fw_tot > 0 else 0.0
        if isinstance(fw_scores.get(fw), dict):
            framework_coverage[fw] = fw_scores[fw]
        else:
            framework_coverage[fw] = {
                "score": fw_pct,
                "passed": fw_pass,
                "failed": fw_fail,
                "total": fw_tot,
            }

    # Evidence Items (Redacted & Grounded)
    evidence_items = []
    for f in findings:
        if f.status in ["FAIL", "PARTIAL"]:
            meta = f.finding_metadata if isinstance(f.finding_metadata, dict) else {}
            src_lines = meta.get("source_lines") or []
            src_line = src_lines[0] if src_lines else meta.get("source_line")
            evidence_items.append({
                "control_id": f.control_id,
                "title": f.title,
                "severity": f.severity,
                "framework": f.framework,
                "source_line": src_line,
                "evidence_text": redact_sensitive_data(f.evidence or ""),
                "why_it_failed": f.description or f"Configuration directive violates baseline standard {f.control_id}.",
            })
    evidence_items = evidence_items[:15]

    # Remediation Playbook (Allowlisted Proposal)
    remediation_items = [
        {
            "vendor": rm.vendor,
            "control": rm.normalized_control or "SECURITY-CONTROL",
            "title": rm.title,
            "commands": redact_sensitive_data(rm.remediation_commands or ""),
            "status": "ALLOWLISTED",
            "execution_status": "DISABLED (READ-ONLY ADVISORY)",
        }
        for rm in rems[:10]
    ]

    # Optional Security Time Machine Evolution Comparison
    security_evolution = None
    if payload.baseline_audit_id and payload.baseline_audit_id != audit.id:
        try:
            comparison = await SecurityTimeMachineService.compare_audits(
                before_audit_id=payload.baseline_audit_id,
                after_audit_id=audit.id,
                db=db,
            )
            security_evolution = comparison.model_dump(mode="json")
        except Exception:
            security_evolution = None

    # Sections dictionary
    sections = {
        "identity": audit_identity,
        "executive_summary": security_posture,
        "findings_summary": findings_summary,
        "framework_coverage": framework_coverage,
        "security_evolution": security_evolution,
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
        "evidence_items": evidence_items,
        "remediation_action_items": remediation_items,
    }

    report_record = {
        "id": report_id,
        "user_id": effective_user.id,
        "report_type": payload.report_type,
        "title": payload.title or f"Executive Compliance Audit Report: {target_device}",
        "target_device": target_device,
        "audit_id": audit.id,
        "compliance_score": security_posture["compliance_score"],
        "status": "COMPLETED",
        "created_at": now,
        "sections": sections,
        "notes": payload.notes or "Official compliance assessment document generated by NetVigil Enterprise Security Intelligence Engine.",
    }

    GENERATED_REPORTS.insert(0, report_record)
    return report_record


from fastapi import APIRouter, Query, Response, status
import json

def _format_report_markdown(report: Dict[str, Any]) -> str:
    title = report.get("title", "NetVigil Executive Compliance Audit Report")
    report_id = report.get("id", "rpt_unknown")
    created_at = report.get("created_at", "")
    compliance_score = float(report.get("compliance_score") or 0.0)
    sections = report.get("sections", {})
    identity = sections.get("identity", {})
    exec_summary = sections.get("executive_summary", {})
    top_risks = sections.get("top_risks", [])

    md = f"""# {title}

**Report ID:** `{report_id}`  
**Classification:** RESTRICTED / ADVISORY  
**Generated At:** {created_at}  
**Target Asset:** {identity.get('filename', 'Network Device')} (Vendor: {str(identity.get('vendor', 'cisco')).upper()})  
**SHA-256 Digest:** `{identity.get('sha256', 'N/A')}`  

---

## 1. Executive Summary & Compliance Verdict

- **Overall Compliance Score:** {compliance_score:.1f}%
- **Evaluated Rules:** {exec_summary.get('evaluated_rules', 0)}
- **Passed Controls:** {exec_summary.get('passed_rules', 0)}
- **Failed / Partial Controls:** {exec_summary.get('failed_rules', 0)}
- **Risk Severity Tier:** {exec_summary.get('severity_tier', 'P0')} (Risk Score: {exec_summary.get('risk_score', 0.0)})

---

## 2. Top Prioritized Risks

"""
    for idx, r in enumerate(top_risks, 1):
        md += f"""### {idx}. [{r.get('priority', 'HIGH')}] {r.get('title', 'Risk Item')} (Score: {r.get('score', 0)})
- **Category:** {r.get('category', 'General')}
- **Description:** {r.get('description', '')}

"""

    md += """---

## 3. Remediation Action Plan & Verification

*Generated deterministically by NetVigil Enterprise Security Intelligence Engine (NTRO - SIH26155).*
"""
    return md


@router.get("/{report_id}/export", summary="Export compliance report as a downloadable file attachment")
async def export_report_file(
    report_id: str,
    current_user: CurrentUserDep,
    format: str = Query("json", description="File format: json, markdown, md, or txt", pattern="^(json|markdown|md|txt)$"),
):
    """Returns report document with Content-Disposition: attachment header for native browser download."""
    report = next((r for r in GENERATED_REPORTS if r["id"] == report_id and r.get("user_id") == current_user.id), None)
    if not report:
        raise NotFoundError(message=f"Report {report_id} not found.")

    target_device = str(report.get("target_device", "asset")).replace(" ", "_").replace("/", "_")
    clean_id = report_id[:8]

    if format in ["markdown", "md"]:
        filename = f"netvigil_report_{target_device}_{clean_id}.md"
        content = _format_report_markdown(report)
        media_type = "text/markdown; charset=utf-8"
    elif format == "txt":
        filename = f"netvigil_report_{target_device}_{clean_id}.txt"
        content = _format_report_markdown(report)
        media_type = "text/plain; charset=utf-8"
    else:
        filename = f"netvigil_report_{target_device}_{clean_id}.json"
        content = json.dumps(report, indent=2, default=str)
        media_type = "application/json; charset=utf-8"

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get("/{report_id}", summary="Get full report document details")
async def get_report_detail(report_id: str, current_user: CurrentUserDep) -> Dict[str, Any]:
    """Retrieves full report content and sections for current user."""
    report = next((r for r in GENERATED_REPORTS if r["id"] == report_id and r.get("user_id") == current_user.id), None)
    if not report:
        raise NotFoundError(message=f"Report {report_id} not found.")
    return report


@router.post("/compare", summary="Compare two audit reports and calculate deterministic deltas")
async def compare_audits(
    payload: CompareAuditsRequest,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> Dict[str, Any]:
    """Compares baseline audit vs remediated audit of the same configuration owned by current user."""
    b_stmt = select(Audit).where(Audit.id == payload.baseline_audit_id, Audit.user_id == current_user.id)
    r_stmt = select(Audit).where(Audit.id == payload.remediated_audit_id, Audit.user_id == current_user.id)
    baseline = (await db.execute(b_stmt)).scalars().first()
    remediated = (await db.execute(r_stmt)).scalars().first()

    if not baseline or not remediated:
        raise NotFoundError(message="One or both audit sessions were not found.")

    if payload.baseline_audit_id == payload.remediated_audit_id:
        raise ValidationError(message="Cannot compare an audit session against itself. Baseline and remediated audit sessions must be distinct.")

    b_findings = list((await db.execute(select(Finding).where(Finding.audit_id == baseline.id, Finding.user_id == current_user.id))).scalars().all())
    r_findings = list((await db.execute(select(Finding).where(Finding.audit_id == remediated.id, Finding.user_id == current_user.id))).scalars().all())

    b_fails = {f.control_id for f in b_findings if f.status in ["FAIL", "PARTIAL"]}
    r_fails = {f.control_id for f in r_findings if f.status in ["FAIL", "PARTIAL"]}

    resolved_controls = sorted(list(b_fails - r_fails))
    new_violations = sorted(list(r_fails - b_fails))
    unchanged_failures = sorted(list(b_fails & r_fails))

    b_score = float(baseline.score) if baseline.score is not None else 0.0
    r_score = float(remediated.score) if remediated.score is not None else 0.0

    return {
        "baseline_audit_id": baseline.id,
        "remediated_audit_id": remediated.id,
        "baseline_compliance_score": b_score,
        "remediated_compliance_score": r_score,
        "compliance_improvement": round(r_score - b_score, 1),
        "baseline_failed_count": len(b_fails),
        "remediated_failed_count": len(r_fails),
        "resolved_count": len(resolved_controls),
        "resolved_controls": resolved_controls,
        "new_violations_count": len(new_violations),
        "new_violations": new_violations,
        "unchanged_failures_count": len(unchanged_failures),
    }

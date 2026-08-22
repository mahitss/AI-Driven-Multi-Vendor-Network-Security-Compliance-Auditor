"""
NetVigil System Overview, Posture Analytics, Activity Stream & Global Search
Problem Statement: SIH26155 (NTRO)
"""
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Query
from sqlalchemy import func, select, desc, or_

from app.api.dependencies import DatabaseDep
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.device import Device
from app.models.finding import Finding
from app.models.risk import RiskItem
from app.models.training import TrainingMapping, TrainingAuditTrail
from app.models.remediation import RemediationProposal

router = APIRouter(prefix="/overview", tags=["Overview"])


@router.get("/stats", summary="Get comprehensive system overview & posture metrics")
async def get_system_overview_stats(
    db: DatabaseDep,
) -> Dict[str, Any]:
    """Provides aggregated metrics and posture score for the NetVigil command center."""
    total_configs = (await db.execute(select(func.count(Configuration.id)))).scalar() or 0
    total_devices = (await db.execute(select(func.count(Device.id)))).scalar() or 0
    total_audits = (await db.execute(select(func.count(Audit.id)))).scalar() or 0
    total_findings = (await db.execute(select(func.count(Finding.id)))).scalar() or 0

    # Severity distribution
    crit_count = (await db.execute(select(func.count(Finding.id)).where(Finding.severity == "CRITICAL", Finding.status.in_(["FAIL", "PARTIAL"])))).scalar() or 0
    high_count = (await db.execute(select(func.count(Finding.id)).where(Finding.severity == "HIGH", Finding.status.in_(["FAIL", "PARTIAL"])))).scalar() or 0
    med_count = (await db.execute(select(func.count(Finding.id)).where(Finding.severity == "MEDIUM", Finding.status.in_(["FAIL", "PARTIAL"])))).scalar() or 0
    low_count = (await db.execute(select(func.count(Finding.id)).where(Finding.severity == "LOW", Finding.status.in_(["FAIL", "PARTIAL"])))).scalar() or 0
    info_count = (await db.execute(select(func.count(Finding.id)).where(Finding.severity == "INFO", Finding.status.in_(["FAIL", "PARTIAL"])))).scalar() or 0
    open_findings = crit_count + high_count + med_count + low_count + info_count

    # Average Compliance Score
    avg_score_stmt = select(func.avg(Audit.score)).where(Audit.score.isnot(None))
    avg_score = (await db.execute(avg_score_stmt)).scalar()
    compliance_score = round(float(avg_score), 1) if avg_score is not None else 0.0

    # Average Risk Score
    avg_risk_stmt = select(func.avg(RiskItem.risk_score))
    avg_risk = (await db.execute(avg_risk_stmt)).scalar()
    risk_score = round(float(avg_risk), 1) if avg_risk is not None else 0.0

    # Vendor distribution
    vendor_dist_stmt = select(Configuration.detected_vendor, func.count(Configuration.id)).group_by(
        Configuration.detected_vendor
    )
    vendor_dist = (await db.execute(vendor_dist_stmt)).all()
    vendor_counts = {vendor: count for vendor, count in vendor_dist}

    # Framework scores aggregated across latest audits
    framework_scores = {"CIS": 0.0, "NIST": 0.0, "STIG": 0.0, "ISO": 0.0}
    latest_audits_stmt = select(Audit).order_by(desc(Audit.created_at)).limit(10)
    audits_res = await db.execute(latest_audits_stmt)
    recent_audits = list(audits_res.scalars().all())

    fw_accum: Dict[str, List[float]] = {"CIS": [], "NIST": [], "STIG": [], "ISO": []}
    for a in recent_audits:
        if isinstance(a.summary_stats, dict) and "framework_scores" in a.summary_stats:
            for fw, fw_data in a.summary_stats["framework_scores"].items():
                if fw.upper() in fw_accum and isinstance(fw_data, dict) and "score" in fw_data:
                    fw_accum[fw.upper()].append(float(fw_data["score"]))

    for fw, scores in fw_accum.items():
        if scores:
            framework_scores[fw] = round(sum(scores) / len(scores), 1)
        elif compliance_score > 0:
            framework_scores[fw] = compliance_score

    # Score trend delta compared to previous audit
    score_delta = None
    if len(recent_audits) >= 2 and recent_audits[0].score is not None and recent_audits[1].score is not None:
        score_delta = round(recent_audits[0].score - recent_audits[1].score, 1)

    return {
        "total_configurations": total_configs,
        "total_devices": max(total_devices, total_configs),  # Ingested configs map to evaluated devices
        "total_audits": total_audits,
        "total_findings": total_findings,
        "open_findings": open_findings,
        "compliance_score": compliance_score,
        "risk_score": risk_score,
        "score_delta": score_delta,
        "severity_breakdown": {
            "critical": crit_count,
            "high": high_count,
            "medium": med_count,
            "low": low_count,
            "info": info_count,
        },
        "framework_scores": framework_scores,
        "vendor_breakdown": vendor_counts,
        "supported_vendors": ["cisco", "juniper", "fortinet"],
        "supported_frameworks": ["CIS", "NIST", "STIG", "ISO"],
    }


@router.get("/activity", summary="Get real system activity log")
async def get_system_activity(
    db: DatabaseDep,
    limit: int = Query(default=15, le=50),
) -> List[Dict[str, Any]]:
    """Aggregates real recent audits, configuration uploads, training approvals, and remediation reviews."""
    events: List[Dict[str, Any]] = []

    # 1. Recent Audits
    audit_stmt = select(Audit).order_by(desc(Audit.created_at)).limit(limit)
    audit_res = await db.execute(audit_stmt)
    for a in audit_res.scalars().all():
        cfg = await db.get(Configuration, a.configuration_id) if a.configuration_id else None
        target_name = cfg.original_filename if cfg else (a.device_id or f"Audit #{a.id[:8]}")
        events.append({
            "id": f"evt-audit-{a.id}",
            "type": "AUDIT_COMPLETED",
            "title": f"Compliance Audit Completed: {target_name}",
            "description": f"Score: {a.score or 0}% • Status: {a.status}",
            "target_id": a.id,
            "target_url": f"/audits",
            "timestamp": a.completed_at or a.created_at,
            "severity": "INFO" if (a.score or 0) >= 80 else "HIGH",
        })

    # 2. Recent Configuration Ingestions
    cfg_stmt = select(Configuration).order_by(desc(Configuration.created_at)).limit(limit)
    cfg_res = await db.execute(cfg_stmt)
    for c in cfg_res.scalars().all():
        events.append({
            "id": f"evt-cfg-{c.id}",
            "type": "CONFIG_INGESTED",
            "title": f"Configuration Uploaded: {c.original_filename}",
            "description": f"Vendor: {c.detected_vendor.upper()} • Status: {c.parser_status}",
            "target_id": c.id,
            "target_url": f"/configurations",
            "timestamp": c.created_at,
            "severity": "INFO",
        })

    # 3. Recent Training Approvals
    trail_stmt = select(TrainingAuditTrail).order_by(desc(TrainingAuditTrail.created_at)).limit(limit)
    trail_res = await db.execute(trail_stmt)
    for t in trail_res.scalars().all():
        events.append({
            "id": f"evt-training-{t.id}",
            "type": "TRAINING_ACTION",
            "title": f"Knowledge Mapping {t.action}: Directive Learned",
            "description": f"Reviewed by {t.user_email or 'Administrator'} • Reason: {t.reason or 'Validated'}",
            "target_id": t.mapping_id,
            "target_url": f"/adaptive-training",
            "timestamp": t.created_at,
            "severity": "SUCCESS" if t.action == "APPROVED" else "WARNING",
        })

    # 4. Recent Remediation Reviews
    rem_stmt = select(RemediationProposal).where(RemediationProposal.is_reviewed == True).order_by(desc(RemediationProposal.updated_at)).limit(limit)
    rem_res = await db.execute(rem_stmt)
    for r in rem_res.scalars().all():
        events.append({
            "id": f"evt-rem-{r.id}",
            "type": "REMEDIATION_REVIEWED",
            "title": f"Remediation Approved: {r.title}",
            "description": f"Vendor: {r.vendor.upper()} • Reviewed by {r.reviewed_by or 'Security Officer'}",
            "target_id": r.id,
            "target_url": f"/remediation",
            "timestamp": r.reviewed_at or r.updated_at,
            "severity": "SUCCESS",
        })

    # Sort all events chronologically descending
    events.sort(key=lambda x: x["timestamp"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return events[:limit]


@router.get("/search", summary="Cross-entity global search")
async def global_search(
    q: str = Query(..., min_length=1, description="Search query string"),
    db: DatabaseDep = None,
) -> Dict[str, List[Dict[str, Any]]]:
    """Searches across Devices, Configurations, Audits, Findings, Risks, and Remediations."""
    term = f"%{q.strip()}%"
    results: Dict[str, List[Dict[str, Any]]] = {
        "devices": [],
        "configurations": [],
        "audits": [],
        "findings": [],
        "risks": [],
        "remediations": [],
    }

    # 1. Search Configurations
    cfg_stmt = select(Configuration).where(
        or_(
            Configuration.original_filename.ilike(term),
            Configuration.detected_vendor.ilike(term),
            Configuration.id.ilike(term),
        )
    ).limit(5)
    cfgs = (await db.execute(cfg_stmt)).scalars().all()
    for c in cfgs:
        results["configurations"].append({
            "id": c.id,
            "title": c.original_filename,
            "subtitle": f"Vendor: {c.detected_vendor.upper()} • Status: {c.parser_status}",
            "url": f"/configurations",
            "badge": c.detected_vendor.upper(),
        })

    # 2. Search Audits
    audit_stmt = select(Audit).where(
        or_(
            Audit.id.ilike(term),
            Audit.device_id.ilike(term),
            Audit.status.ilike(term),
        )
    ).limit(5)
    audits = (await db.execute(audit_stmt)).scalars().all()
    for a in audits:
        results["audits"].append({
            "id": a.id,
            "title": f"Audit {a.id[:8]}...",
            "subtitle": f"Score: {a.score or 0}% • Status: {a.status}",
            "url": f"/audits",
            "badge": f"{a.score or 0}%",
        })

    # 3. Search Findings
    finding_stmt = select(Finding).where(
        or_(
            Finding.title.ilike(term),
            Finding.control_id.ilike(term),
            Finding.framework.ilike(term),
            Finding.evidence.ilike(term),
        )
    ).limit(6)
    findings = (await db.execute(finding_stmt)).scalars().all()
    for f in findings:
        results["findings"].append({
            "id": f.id,
            "title": f"{f.framework} • {f.control_id}: {f.title}",
            "subtitle": f"Severity: {f.severity} • Status: {f.status}",
            "url": f"/audits",
            "badge": f.severity,
        })

    # 4. Search Risks
    risk_stmt = select(RiskItem).where(
        or_(
            RiskItem.title.ilike(term),
            RiskItem.category.ilike(term),
            RiskItem.description.ilike(term),
        )
    ).limit(5)
    risks = (await db.execute(risk_stmt)).scalars().all()
    for r in risks:
        results["risks"].append({
            "id": r.id,
            "title": r.title,
            "subtitle": f"Score: {r.risk_score} • Priority: {r.priority} • Category: {r.category}",
            "url": f"/risk",
            "badge": r.priority,
        })

    # 5. Search Remediations
    rem_stmt = select(RemediationProposal).where(
        or_(
            RemediationProposal.title.ilike(term),
            RemediationProposal.normalized_control.ilike(term),
            RemediationProposal.remediation_commands.ilike(term),
        )
    ).limit(5)
    rems = (await db.execute(rem_stmt)).scalars().all()
    for rm in rems:
        results["remediations"].append({
            "id": rm.id,
            "title": rm.title,
            "subtitle": f"Vendor: {rm.vendor.upper()} • Status: {rm.status}",
            "url": f"/remediation",
            "badge": rm.vendor.upper(),
        })

    return results

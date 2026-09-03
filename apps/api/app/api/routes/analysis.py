"""
Deterministic End-to-End Security Analysis Pipeline Routes
Problem Statement: SIH26155 (NTRO)

Provides the authoritative, deterministic pipeline:
REAL CONFIGURATION → INGESTION → PARSER → AST → CONTROLS → EVIDENCE → FINDINGS → RISK → REMEDIATION → RE-ANALYSIS
"""
from datetime import datetime, timezone
import hashlib
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select

from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.core.errors import ResourceNotFoundError, ValidationError
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.finding import Finding
from app.services.compliance.catalog import compliance_catalog
from app.services.compliance.evaluator import RuleEvaluator
from app.services.compliance.scorer import ComplianceScoringEngine
from app.services.compliance.service import ComplianceAuditService
from app.services.ingestion.config_ingestion import ConfigurationIngestionService
from app.services.parser.models import NormalizedSecurityProfile
from app.services.parser.registry import parser_registry
from app.services.parsing.vendor_detector import VendorDetector
from app.services.remediation.diff_generator import generate_remediation_diff
from app.services.risk.scoring import calculate_risk_score, calculate_composite_risk_score

router = APIRouter(prefix="/analysis", tags=["Security Analysis Pipeline"])


# --- Schemas ---
class IngestAnalysisRequest(BaseModel):
    content: str = Field(..., description="Raw network configuration text")
    filename: Optional[str] = Field(default="cisco_edge_router.cfg", description="Original file name")
    vendor_hint: Optional[str] = Field(default=None, description="Optional vendor hint (cisco, juniper, fortinet)")


class IngestAnalysisResponse(BaseModel):
    analysis_id: str
    vendor: str
    platform: Optional[str] = None
    status: str
    filename: str
    file_hash: str
    lines_count: int
    facts_extracted_count: int
    unknown_items_count: int


class EvidenceItem(BaseModel):
    line: Optional[int] = None
    raw_text: str
    property_path: Optional[str] = None
    context: Optional[str] = None
    evidence_status: Optional[str] = "configured"  # "configured" or "unconfigured"




class FindingItem(BaseModel):
    finding_id: str
    control_id: str
    framework: str
    title: str
    severity: str
    status: str  # PASS, FAIL, NOT_APPLICABLE, UNKNOWN
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None
    why_it_failed: Optional[str] = None
    evidence_lines: List[EvidenceItem] = []
    remediation_proposal: Optional[str] = None
    remediation_diff: Optional[Dict[str, Any]] = None


class RiskAnalysisResponse(BaseModel):
    risk_score: float
    risk_level: str  # P0, P1, P2, P3
    likelihood: str
    formula_breakdown: str
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    contributing_findings: List[Dict[str, Any]]


class AnalysisStatusResponse(BaseModel):
    analysis_id: str
    filename: str
    vendor: str
    platform: Optional[str] = None
    status: str
    lines_parsed: int
    facts_extracted_count: int
    unknown_items_count: int
    controls_evaluated_count: int
    pass_count: int
    fail_count: int
    unknown_count: int
    compliance_score: float
    risk_score: float
    risk_level: str
    total_applicable_controls: Optional[int] = None
    not_applicable_count: Optional[int] = None
    passed_controls: Optional[int] = None
    failed_controls: Optional[int] = None
    unknown_controls: Optional[int] = None
    compliance_percent: Optional[float] = None
    created_at: datetime
    processed_at: Optional[datetime] = None


class ReanalyzeRequest(BaseModel):
    modified_content: str = Field(..., description="Updated configuration content after remediation")


class ReanalyzeResponse(BaseModel):
    analysis_id: str
    status: str
    previous_fail_count: int
    new_fail_count: int
    previous_compliance_score: float
    new_compliance_score: float
    previous_risk_score: float
    new_risk_score: float
    resolved_controls: List[str]
    findings_transition: List[Dict[str, Any]]


# --- Routes ---

@router.post(
    "/ingest",
    response_model=IngestAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest raw configuration and execute deterministic parsing & AST extraction",
)
async def ingest_configuration_for_analysis(
    payload: IngestAnalysisRequest,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> IngestAnalysisResponse:
    """
    Step 1: Real Ingestion & Parsing
    - Ingests raw configuration string scoped to current_user
    - Detects vendor deterministically
    - Extracts AST and security facts with exact line numbers
    - Persists configuration and initial audit state
    """
    raw_content = payload.content.strip()
    if not raw_content:
        raise ValidationError(message="Configuration content cannot be empty.")

    content_bytes = raw_content.encode("utf-8")
    filename = (payload.filename or "cisco_edge_router.cfg").strip()
    if not filename or filename.startswith("."):
        filename = "cisco_edge_router.cfg"

    # Persist via Ingestion Service scoped to current user
    config_record = await ConfigurationIngestionService.ingest_file(
        filename=filename,
        content_bytes=content_bytes,
        db=db,
        user_id=current_user.id,
    )

    # Dynamic Parser Selection & Deterministic AST Extraction
    # Prioritize authoritative syntax detection from config_record.detected_vendor
    if config_record.detected_vendor and config_record.detected_vendor != "unknown":
        effective_vendor_hint = config_record.detected_vendor
    else:
        effective_vendor_hint = payload.vendor_hint if (payload.vendor_hint and payload.vendor_hint != "unknown") else "cisco"
    parser = parser_registry.get_parser(
        content=raw_content,
        vendor_hint=effective_vendor_hint,
        filename=filename,
    )
    profile = parser.parse(raw_content, filename=filename)

    # Update configuration entity with normalized facts
    config_record.parser_status = "parsed"
    config_record.parser_name = profile.parser_name
    config_record.parser_version = profile.parser_version
    config_record.facts_extracted_count = profile.facts_extracted_count
    config_record.unknown_items_count = profile.unknown_items_count
    config_record.normalized_profile = profile.model_dump(mode="json")
    config_record.unknown_items = [u.model_dump(mode="json") for u in profile.unknown_items]
    config_record.processed_at = datetime.now(timezone.utc)
    config_record.detected_vendor = profile.vendor
    if profile.platform:
        config_record.detected_platform = profile.platform

    await db.commit()
    await db.refresh(config_record)

    # Auto-execute initial deterministic audit across standard frameworks scoped to current user
    await ComplianceAuditService.run_audit(
        configuration_id=config_record.id,
        frameworks=["CIS", "NIST", "STIG", "ISO"],
        db=db,
        user_id=current_user.id,
    )

    lines = raw_content.splitlines()

    return IngestAnalysisResponse(
        analysis_id=config_record.id,
        vendor=config_record.detected_vendor,
        platform=config_record.detected_platform,
        status="INGESTED",
        filename=config_record.original_filename,
        file_hash=config_record.hash,
        lines_count=len(lines),
        facts_extracted_count=profile.facts_extracted_count,
        unknown_items_count=profile.unknown_items_count,
    )


@router.get(
    "/{analysis_id}",
    response_model=AnalysisStatusResponse,
    summary="Get complete deterministic analysis pipeline status and derived scores",
)
async def get_analysis_status(
    analysis_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> AnalysisStatusResponse:
    """Fetch complete analysis execution state, compliance metrics, and derived risk for current user."""
    stmt = select(Configuration).where(Configuration.id == analysis_id, Configuration.user_id == current_user.id)
    cfg = (await db.execute(stmt)).scalars().first()
    if not cfg:
        raise ResourceNotFoundError(resource="Analysis", identifier=analysis_id)

    # Fetch latest audit for this configuration
    audit_stmt = (
        select(Audit)
        .where(Audit.configuration_id == analysis_id, Audit.user_id == current_user.id)
        .order_by(desc(Audit.created_at))
        .limit(1)
    )
    audit_res = await db.execute(audit_stmt)
    audit = audit_res.scalars().first()

    pass_count = 0
    fail_count = 0
    unknown_count = 0
    na_count = 0
    total_applicable = 0
    comp_score = 0.0

    if audit:
        findings_stmt = select(Finding).where(Finding.audit_id == audit.id, Finding.user_id == current_user.id)
        f_res = await db.execute(findings_stmt)
        findings = f_res.scalars().all()

        pass_count = sum(1 for f in findings if f.status == "PASS")
        fail_count = sum(1 for f in findings if f.status == "FAIL")
        unknown_count = sum(1 for f in findings if f.status == "UNKNOWN")
        na_count = sum(1 for f in findings if f.status == "NOT_APPLICABLE")
        total_applicable = pass_count + fail_count + unknown_count

        if total_applicable > 0:
            comp_score = round(pass_count / total_applicable * 100.0, 1)
        elif audit.score is not None:
            comp_score = audit.score
        else:
            comp_score = 100.0

    # Calculate derived risk from actual findings
    crit_count = 0
    high_count = 0
    med_count = 0
    low_count = 0

    if audit:
        findings_stmt = select(Finding).where(Finding.audit_id == audit.id, Finding.user_id == current_user.id, Finding.status == "FAIL")
        f_res = await db.execute(findings_stmt)
        fail_findings = f_res.scalars().all()
        for f in fail_findings:
            sev = (f.severity or "MEDIUM").upper()
            if sev == "CRITICAL":
                crit_count += 1
            elif sev == "HIGH":
                high_count += 1
            elif sev == "MEDIUM":
                med_count += 1
            else:
                low_count += 1

    r_score, r_level, _ = calculate_composite_risk_score(
        crit_count=crit_count,
        high_count=high_count,
        med_count=med_count,
        low_count=low_count,
        total_evaluated=total_applicable if total_applicable > 0 else (len(findings) if audit else 60),
    )

    lines_parsed = len((cfg.raw_content or "").splitlines())

    return AnalysisStatusResponse(
        analysis_id=cfg.id,
        filename=cfg.original_filename,
        vendor=cfg.detected_vendor,
        platform=cfg.detected_platform,
        status="COMPLETED" if cfg.parser_status == "parsed" else "PROCESSING",
        lines_parsed=lines_parsed,
        facts_extracted_count=cfg.facts_extracted_count or 0,
        unknown_items_count=cfg.unknown_items_count or 0,
        controls_evaluated_count=total_applicable if total_applicable > 0 else (len(findings) if audit else 0),
        pass_count=pass_count,
        fail_count=fail_count,
        unknown_count=unknown_count,
        compliance_score=comp_score,
        risk_score=r_score,
        risk_level=r_level,
        total_applicable_controls=total_applicable,
        not_applicable_count=na_count,
        passed_controls=pass_count,
        failed_controls=fail_count,
        unknown_controls=unknown_count,
        compliance_percent=comp_score,
        created_at=cfg.created_at,
        processed_at=cfg.processed_at,
    )


@router.get(
    "/{analysis_id}/findings",
    response_model=List[FindingItem],
    summary="Get deterministic control evaluation findings with exact configuration line citations",
)
async def get_analysis_findings(
    analysis_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
    status_filter: Optional[str] = Query(None, description="Filter by status (FAIL, PASS, UNKNOWN)"),
) -> List[FindingItem]:
    """Retrieves all evaluated control findings, evidence lines, and remediation proposals for current user."""
    stmt = select(Configuration).where(Configuration.id == analysis_id, Configuration.user_id == current_user.id)
    cfg = (await db.execute(stmt)).scalars().first()
    if not cfg:
        raise ResourceNotFoundError(resource="Analysis", identifier=analysis_id)

    audit_stmt = (
        select(Audit)
        .where(Audit.configuration_id == analysis_id, Audit.user_id == current_user.id)
        .order_by(desc(Audit.created_at))
        .limit(1)
    )
    audit_res = await db.execute(audit_stmt)
    audit = audit_res.scalars().first()

    if not audit:
        return []

    query = select(Finding).where(Finding.audit_id == audit.id, Finding.user_id == current_user.id)
    if status_filter:
        query = query.where(Finding.status == status_filter.upper())
    else:
        query = query.where(Finding.status.in_(["PASS", "FAIL", "UNKNOWN"]))
    query = query.order_by(Finding.severity, Finding.control_id)

    f_res = await db.execute(query)
    findings = f_res.scalars().all()

    items: List[FindingItem] = []
    for f in findings:
        evidence_items: List[EvidenceItem] = []
        meta = f.finding_metadata if isinstance(f.finding_metadata, dict) else {}

        source_lines = meta.get("source_lines") or []
        evidence_list = meta.get("evidence_list") or []

        valid_lines = [l for l in source_lines if isinstance(l, int) and l > 0]

        if valid_lines:
            for i, line_num in enumerate(valid_lines):
                raw_snippet = evidence_list[i] if i < len(evidence_list) else (f.evidence or "")
                evidence_items.append(
                    EvidenceItem(
                        line=line_num,
                        raw_text=raw_snippet,
                        property_path=meta.get("property"),
                        evidence_status="configured",
                    )
                )
        elif f.evidence:
            clean_snippet = f.evidence
            if clean_snippet in [
                "Baseline",
                "Baseline Absent",
                "Non-compliant configuration baseline",
                "[No direct line evidence — evaluated from default baseline]",
            ]:
                clean_snippet = "Unconfigured Directive"

            evidence_items.append(
                EvidenceItem(
                    line=None,
                    raw_text=clean_snippet,
                    property_path=meta.get("property"),
                    evidence_status="unconfigured",
                )
            )
        else:
            evidence_items.append(
                EvidenceItem(
                    line=None,
                    raw_text="Unconfigured Directive",
                    property_path=meta.get("property"),
                    evidence_status="unconfigured",
                )
            )

        # Normalize actual_value if it holds legacy baseline text
        norm_actual = f.actual_value
        if norm_actual in ["Baseline", "Baseline Absent"]:
            norm_actual = "None / Unconfigured"

        # Generate structured remediation diff if finding failed
        remed_diff = None
        if f.status == "FAIL" and f.remediation and f.evidence:
            remed_diff = generate_remediation_diff(
                current_evidence=f.evidence,
                remediation_commands=f.remediation,
                vendor=cfg.detected_vendor,
            )

        items.append(
            FindingItem(
                finding_id=f.id,
                control_id=f.control_id,
                framework=f.framework,
                title=f.title,
                severity=f.severity,
                status=f.status,
                expected_value=f.expected_value,
                actual_value=norm_actual,
                why_it_failed=f.description,
                evidence_lines=evidence_items,
                remediation_proposal=f.remediation,
                remediation_diff=remed_diff,
            )
        )

    return items


@router.get(
    "/{analysis_id}/evidence",
    response_model=List[EvidenceItem],
    summary="Get all extracted AST evidence lines and property mappings",
)
async def get_analysis_evidence(
    analysis_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> List[EvidenceItem]:
    """Returns every cited configuration line mapped to its Universal Security property for current user."""
    stmt = select(Configuration).where(Configuration.id == analysis_id, Configuration.user_id == current_user.id)
    cfg = (await db.execute(stmt)).scalars().first()
    if not cfg:
        raise ResourceNotFoundError(resource="Analysis", identifier=analysis_id)

    if not cfg.normalized_profile:
        return []

    profile = NormalizedSecurityProfile.model_validate(cfg.normalized_profile)
    profile_dict = profile.model_dump(mode="json")
    evidence_items: List[EvidenceItem] = []

    # Traverse all fact sections in the profile
    for domain_name in [
        "identity",
        "remote_access",
        "authentication",
        "authorization",
        "logging",
        "time_sync",
        "access_control",
        "services",
        "management",
        "network_security",
    ]:
        domain_dict = profile_dict.get(domain_name, {})
        if isinstance(domain_dict, dict):
            for prop_name, fact_dict in domain_dict.items():
                if isinstance(fact_dict, dict):
                    lines = fact_dict.get("source_lines") or []
                    ev_list = fact_dict.get("evidence") or []
                    valid_lines = [l for l in lines if isinstance(l, int) and l > 0]
                    if valid_lines:
                        for i, l_num in enumerate(valid_lines):
                            txt = ev_list[i] if i < len(ev_list) else str(fact_dict.get("value"))
                            evidence_items.append(
                                EvidenceItem(
                                    line=l_num,
                                    raw_text=txt,
                                    property_path=f"{domain_name}.{prop_name}",
                                    context=domain_name,
                                    evidence_status="configured",
                                )
                            )
                    elif fact_dict.get("status") in ["unknown", "default_inferred"] or fact_dict.get("value") is not None:
                        val_str = str(fact_dict.get("value")) if fact_dict.get("value") is not None else "Unconfigured"
                        evidence_items.append(
                            EvidenceItem(
                                line=None,
                                raw_text=val_str,
                                property_path=f"{domain_name}.{prop_name}",
                                context=domain_name,
                                evidence_status="unconfigured",
                            )
                        )

    return sorted(evidence_items, key=lambda x: (x.line is None, x.line or 0))


@router.get(
    "/{analysis_id}/risk",
    response_model=RiskAnalysisResponse,
    summary="Get explainable deterministic risk calculation and contributing findings",
)
async def get_analysis_risk(
    analysis_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> RiskAnalysisResponse:
    """Calculates deterministic risk score derived solely from active failed findings for current user."""
    stmt = select(Configuration).where(Configuration.id == analysis_id, Configuration.user_id == current_user.id)
    cfg = (await db.execute(stmt)).scalars().first()
    if not cfg:
        raise ResourceNotFoundError(resource="Analysis", identifier=analysis_id)

    audit_stmt = (
        select(Audit)
        .where(Audit.configuration_id == analysis_id, Audit.user_id == current_user.id)
        .order_by(desc(Audit.created_at))
        .limit(1)
    )
    audit_res = await db.execute(audit_stmt)
    audit = audit_res.scalars().first()

    if not audit:
        return RiskAnalysisResponse(
            risk_score=0.0,
            risk_level="P3",
            likelihood="LOW",
            formula_breakdown="Zero evaluated findings.",
            total_findings=0,
            critical_count=0,
            high_count=0,
            medium_count=0,
            low_count=0,
            contributing_findings=[],
        )

    f_stmt = select(Finding).where(Finding.audit_id == audit.id, Finding.user_id == current_user.id, Finding.status == "FAIL")
    f_res = await db.execute(f_stmt)
    fail_findings = f_res.scalars().all()

    crit_count = sum(1 for f in fail_findings if (f.severity or "").upper() == "CRITICAL")
    high_count = sum(1 for f in fail_findings if (f.severity or "").upper() == "HIGH")
    med_count = sum(1 for f in fail_findings if (f.severity or "").upper() == "MEDIUM")
    low_count = sum(1 for f in fail_findings if (f.severity or "").upper() == "LOW")

    total_failed = len(fail_findings)

    if total_failed == 0:
        return RiskAnalysisResponse(
            risk_score=0.0,
            risk_level="P3",
            likelihood="LOW",
            formula_breakdown="Zero non-compliant findings detected. Risk is 0 / 100.",
            total_findings=0,
            critical_count=0,
            high_count=0,
            medium_count=0,
            low_count=0,
            contributing_findings=[],
        )

    total_eval_stmt = select(func.count(Finding.id)).where(
        Finding.audit_id == audit.id,
        Finding.user_id == current_user.id,
        Finding.status.in_(["PASS", "FAIL", "UNKNOWN"]),
    )
    total_eval = (await db.execute(total_eval_stmt)).scalar() or total_failed

    risk_score, risk_level, likelihood = calculate_composite_risk_score(
        crit_count=crit_count,
        high_count=high_count,
        med_count=med_count,
        low_count=low_count,
        total_evaluated=total_eval,
    )

    breakdown_parts = []
    if crit_count > 0:
        breakdown_parts.append(f"{crit_count} CRITICAL")
    if high_count > 0:
        breakdown_parts.append(f"{high_count} HIGH")
    if med_count > 0:
        breakdown_parts.append(f"{med_count} MEDIUM")
    if low_count > 0:
        breakdown_parts.append(f"{low_count} LOW")

    breakdown_str = f"Calculated from {total_failed} non-compliant findings: {', '.join(breakdown_parts)}"

    contributing = [
        {
            "finding_id": f.id,
            "control_id": f.control_id,
            "title": f.title,
            "severity": f.severity,
            "evidence": f.evidence,
        }
        for f in fail_findings
    ]

    return RiskAnalysisResponse(
        risk_score=risk_score,
        risk_level=risk_level,
        likelihood=likelihood,
        formula_breakdown=breakdown_str,
        total_findings=total_failed,
        critical_count=crit_count,
        high_count=high_count,
        medium_count=med_count,
        low_count=low_count,
        contributing_findings=contributing,
    )


@router.post(
    "/{analysis_id}/reanalyze",
    response_model=ReanalyzeResponse,
    summary="Re-evaluate modified configuration and prove remediation turns FAIL into PASS",
)
async def reanalyze_modified_configuration(
    analysis_id: str,
    payload: ReanalyzeRequest,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> ReanalyzeResponse:
    """
    Step 9: Re-Analysis & Deterministic Verification
    - Accepts remediated configuration text
    - Re-parses configuration AST
    - Re-evaluates controls
    - Demonstrates before-and-after finding transitions
    """
    stmt = select(Configuration).where(Configuration.id == analysis_id, Configuration.user_id == current_user.id)
    cfg = (await db.execute(stmt)).scalars().first()
    if not cfg:
        raise ResourceNotFoundError(resource="Analysis", identifier=analysis_id)

    new_content = payload.modified_content.strip()
    if not new_content:
        raise ValidationError(message="Modified configuration text cannot be empty.")

    # 1. Fetch previous audit stats for delta
    prev_audit_stmt = (
        select(Audit)
        .where(Audit.configuration_id == analysis_id, Audit.user_id == current_user.id)
        .order_by(desc(Audit.created_at))
        .limit(1)
    )
    prev_res = await db.execute(prev_audit_stmt)
    prev_audit = prev_res.scalars().first()

    prev_score = prev_audit.score if prev_audit else 0.0
    prev_findings_stmt = select(Finding).where(Finding.audit_id == (prev_audit.id if prev_audit else ""), Finding.user_id == current_user.id)
    prev_f_res = await db.execute(prev_findings_stmt)
    prev_findings = {f.control_id: f for f in prev_f_res.scalars().all()}
    prev_fail_count = sum(1 for f in prev_findings.values() if f.status == "FAIL")

    # 2. Update Configuration with new content
    cfg.raw_content = new_content
    cfg.file_size_bytes = len(new_content.encode("utf-8"))
    cfg.hash = hashlib.sha256(new_content.encode("utf-8")).hexdigest()

    # 3. Re-parse with deterministic parser
    parser = parser_registry.get_parser(
        content=new_content,
        vendor_hint=cfg.detected_vendor,
        filename=cfg.original_filename,
    )
    new_profile = parser.parse(new_content, filename=cfg.original_filename)

    cfg.parser_status = "parsed"
    cfg.facts_extracted_count = new_profile.facts_extracted_count
    cfg.unknown_items_count = new_profile.unknown_items_count
    cfg.normalized_profile = new_profile.model_dump(mode="json")
    cfg.unknown_items = [u.model_dump(mode="json") for u in new_profile.unknown_items]
    cfg.processed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(cfg)

    # 4. Re-run multi-framework compliance audit
    new_audit, new_summary, _ = await ComplianceAuditService.run_audit(
        configuration_id=cfg.id,
        frameworks=["CIS", "NIST", "STIG", "ISO"],
        db=db,
        user_id=current_user.id,
    )

    # 5. Fetch new findings to calculate transitions
    new_findings_stmt = select(Finding).where(Finding.audit_id == new_audit.id, Finding.user_id == current_user.id)
    new_f_res = await db.execute(new_findings_stmt)
    new_findings = {f.control_id: f for f in new_f_res.scalars().all()}
    new_fail_count = sum(1 for f in new_findings.values() if f.status == "FAIL")

    resolved_controls: List[str] = []
    transitions: List[Dict[str, Any]] = []

    for ctrl_id, old_f in prev_findings.items():
        new_f = new_findings.get(ctrl_id)
        if new_f and old_f.status == "FAIL" and new_f.status == "PASS":
            resolved_controls.append(ctrl_id)
            transitions.append({
                "control_id": ctrl_id,
                "framework": old_f.framework,
                "title": old_f.title,
                "previous_status": "FAIL",
                "new_status": "PASS",
                "resolved": True,
            })
        elif new_f and old_f.status != new_f.status:
            transitions.append({
                "control_id": ctrl_id,
                "framework": old_f.framework,
                "title": old_f.title,
                "previous_status": old_f.status,
                "new_status": new_f.status,
                "resolved": False,
            })

    # Calculate previous & new risk scores
    prev_r_score = round(min(100.0, prev_fail_count * 12.5), 1) if prev_fail_count > 0 else 0.0
    new_r_score = round(min(100.0, new_fail_count * 12.5), 1) if new_fail_count > 0 else 0.0

    return ReanalyzeResponse(
        analysis_id=cfg.id,
        status="REANALYZED",
        previous_fail_count=prev_fail_count,
        new_fail_count=new_fail_count,
        previous_compliance_score=prev_score,
        new_compliance_score=new_audit.score or 0.0,
        previous_risk_score=prev_r_score,
        new_risk_score=new_r_score,
        resolved_controls=resolved_controls,
        findings_transition=transitions,
    )


@router.get(
    "/{analysis_id}/configuration",
    summary="Get raw stored configuration text with line numbering metadata",
)
async def get_analysis_configuration(
    analysis_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> Dict[str, Any]:
    """Fetches raw configuration content with line numbers for evidence inspection for current user."""
    stmt = select(Configuration).where(Configuration.id == analysis_id, Configuration.user_id == current_user.id)
    cfg = (await db.execute(stmt)).scalars().first()
    if not cfg:
        raise ResourceNotFoundError(resource="Analysis", identifier=analysis_id)

    lines = (cfg.raw_content or "").splitlines()
    numbered_lines = [{"line": i + 1, "text": line} for i, line in enumerate(lines)]

    return {
        "analysis_id": cfg.id,
        "filename": cfg.original_filename,
        "vendor": cfg.detected_vendor,
        "hash": cfg.hash,
        "line_count": len(lines),
        "lines": numbered_lines,
        "raw_text": cfg.raw_content,
    }

"""
Regression Test Suite for P0 Audit State and Summary Consistency
Problem Statement: SIH26155 (NTRO)

Verifies Requirements A through L:
A. Risk pending must NOT render or serialize 0.0.
B. Risk pending must NOT render or serialize an authoritative priority.
C. Compliance unavailable must render/serialize None (frontend renders --).
D. Audit cannot be COMPLETE while Risk is pending.
E. Findings may exist while Risk is pending without faking completion.
F. Switching audits clears old summary state.
G. Re-analysis clears old risk/compliance before new results arrive.
H. Normalized facts are sourced strictly from facts_extracted_count (4 for Juniper Telnet, NOT 43).
I. No cross-audit state leakage between Cisco, Fortinet, and Juniper.
J. Existing applicable-control compliance calculation remains passed_applicable / total_applicable.
K. Existing real evidence/line citations remain preserved.
L. No "Baseline" fallback returns.
"""
from pathlib import Path
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.auth import AuthenticatedUser
from app.models.configuration import Configuration
from app.models.audit import Audit
from app.models.finding import Finding
from app.api.routes.analysis import (
    ingest_configuration_for_analysis,
    get_analysis_status,
    get_analysis_findings,
    get_analysis_risk,
    reanalyze_modified_configuration,
    IngestAnalysisRequest,
    ReanalyzeRequest,
)

BENCHMARKS_DIR = Path(__file__).resolve().parents[3] / "data" / "sample-configs" / "benchmarks"


@pytest.mark.asyncio
async def test_a_b_c_d_e_pending_audit_does_not_serialize_zero_or_fake_complete(db_session: AsyncSession):
    """
    A, B, C, D, E:
    When a configuration exists without a finalized audit:
    - risk_score must be None (NEVER 0.0)
    - risk_level must be None (NEVER P1 or P3)
    - compliance_score must be None (NEVER 0.0)
    - status must be PROCESSING (NEVER COMPLETED)
    - Findings/facts may exist without faking completion.
    """
    user = AuthenticatedUser(id="user-pending-test", email="pending@netvigil.io", role="auditor", app_metadata={}, user_metadata={})

    # Create configuration directly without running an audit
    cfg = Configuration(
        user_id=user.id,
        original_filename="pending_device.cfg",
        detected_vendor="cisco",
        raw_content="hostname ROUTER-PENDING\ninterface GigabitEthernet0/0\n",
        parser_status="parsed",
        facts_extracted_count=3,
        hash="pendinghash123",
        file_size_bytes=60,
    )
    db_session.add(cfg)
    await db_session.commit()
    await db_session.refresh(cfg)

    # 1. Inspect status response
    status_res = await get_analysis_status(cfg.id, db_session, user)
    assert status_res.status == "PROCESSING", "Audit cannot be COMPLETED when no audit has executed."
    assert status_res.compliance_score is None, "Compliance score must be None when audit has not run."
    assert status_res.risk_score is None, "Risk score must NOT default to 0.0 when audit has not run."
    assert status_res.risk_level is None, "Risk level must NOT default to P1/P3 when audit has not run."
    assert status_res.facts_extracted_count == 3, "Facts extracted count must reflect the configuration AST."

    # 2. Inspect risk response
    risk_res = await get_analysis_risk(cfg.id, db_session, user)
    assert risk_res.risk_score is None, "Risk endpoint must NOT return 0.0 when audit is pending."
    assert risk_res.risk_level is None, "Risk endpoint must NOT return a priority when audit is pending."


@pytest.mark.asyncio
async def test_h_j_juniper_telnet_enabled_authoritative_facts_and_compliance(db_session: AsyncSession):
    """
    H & J:
    05_JUNIPER_TELNET_ENABLED.set must produce:
    - facts_extracted_count = 4 (NOT 43!)
    - total_applicable_controls = 32
    - failed_controls = 32
    - passed_controls = 0
    - compliance_score = 0.0 (0 / 32 * 100)
    - risk_score = 100.0, risk_level = P0
    """
    user = AuthenticatedUser(id="user-juniper-telnet-check", email="jtel@netvigil.io", role="auditor", app_metadata={}, user_metadata={})
    p = BENCHMARKS_DIR / "05_JUNIPER_TELNET_ENABLED.set"
    content = p.read_text(encoding="utf-8")

    req = IngestAnalysisRequest(content=content, filename=p.name, vendor_hint="juniper")
    ingest_res = await ingest_configuration_for_analysis(req, db_session, user)

    status_res = await get_analysis_status(ingest_res.analysis_id, db_session, user)

    # Requirement H: Sourced strictly from facts_extracted_count
    assert status_res.facts_extracted_count == 4, f"Normalized facts must be 4, got {status_res.facts_extracted_count}"
    assert status_res.fail_count == 32, f"Failed controls must be 32, got {status_res.fail_count}"
    assert status_res.pass_count == 0, f"Passed controls must be 0, got {status_res.pass_count}"

    # Requirement J: Applicable control compliance passed / total
    assert status_res.total_applicable_controls == 32
    assert status_res.compliance_score == 0.0
    assert status_res.risk_score == 100.0
    assert status_res.risk_level == "P0"
    assert status_res.status == "COMPLETED"


@pytest.mark.asyncio
async def test_f_i_switching_audits_isolation(db_session: AsyncSession):
    """
    F & I:
    Verify cross-audit isolation across Cisco Hardened, Juniper Critical, and Juniper Telnet:
    Each audit preserves its own independent facts, findings, compliance, and risk.
    """
    user = AuthenticatedUser(id="user-multi-switch", email="switch@netvigil.io", role="auditor", app_metadata={}, user_metadata={})

    # 1. Cisco Hardened (43 facts, high compliance)
    cisco_p = BENCHMARKS_DIR / "02_CISCO_HARDENED.cfg"
    cisco_req = IngestAnalysisRequest(content=cisco_p.read_text(encoding="utf-8"), filename=cisco_p.name, vendor_hint="cisco")
    cisco_res = await ingest_configuration_for_analysis(cisco_req, db_session, user)
    cisco_status = await get_analysis_status(cisco_res.analysis_id, db_session, user)
    assert cisco_status.facts_extracted_count == 43
    assert cisco_status.vendor == "cisco"

    # 2. Juniper Critical (6 facts, 36 fail, score 10.0%)
    jcrit_p = BENCHMARKS_DIR / "04_JUNIPER_CRITICAL.set"
    jcrit_req = IngestAnalysisRequest(content=jcrit_p.read_text(encoding="utf-8"), filename=jcrit_p.name, vendor_hint="juniper")
    jcrit_res = await ingest_configuration_for_analysis(jcrit_req, db_session, user)
    jcrit_status = await get_analysis_status(jcrit_res.analysis_id, db_session, user)
    assert jcrit_status.facts_extracted_count == 6
    assert jcrit_status.fail_count == 36
    assert jcrit_status.pass_count == 4
    assert jcrit_status.vendor == "juniper"

    # 3. Juniper Telnet (4 facts, 32 fail, score 0.0%)
    jtel_p = BENCHMARKS_DIR / "05_JUNIPER_TELNET_ENABLED.set"
    jtel_req = IngestAnalysisRequest(content=jtel_p.read_text(encoding="utf-8"), filename=jtel_p.name, vendor_hint="juniper")
    jtel_res = await ingest_configuration_for_analysis(jtel_req, db_session, user)
    jtel_status = await get_analysis_status(jtel_res.analysis_id, db_session, user)
    assert jtel_status.facts_extracted_count == 4
    assert jtel_status.fail_count == 32
    assert jtel_status.pass_count == 0
    assert jtel_status.vendor == "juniper"

    # Re-query Cisco to prove zero state contamination
    cisco_recheck = await get_analysis_status(cisco_res.analysis_id, db_session, user)
    assert cisco_recheck.facts_extracted_count == 43
    assert cisco_recheck.vendor == "cisco"


@pytest.mark.asyncio
async def test_g_reanalysis_flow_provenance(db_session: AsyncSession):
    """
    G:
    Re-analysis updates configuration content, generates new audit, and records verification deltas.
    """
    user = AuthenticatedUser(id="user-reanalysis-flow", email="reanalysis@netvigil.io", role="auditor", app_metadata={}, user_metadata={})
    p = BENCHMARKS_DIR / "04_CISCO_REAL_EVIDENCE.cfg"
    content = p.read_text(encoding="utf-8")

    req = IngestAnalysisRequest(content=content, filename=p.name, vendor_hint="cisco")
    ingest_res = await ingest_configuration_for_analysis(req, db_session, user)

    # Initial status
    status_init = await get_analysis_status(ingest_res.analysis_id, db_session, user)
    assert status_init.verification_status == "pending"

    # Patch SSH v1 -> SSH v2
    remediated_content = content.replace("ip ssh version 1", "ip ssh version 2")
    re_req = ReanalyzeRequest(modified_content=remediated_content)
    re_res = await reanalyze_modified_configuration(ingest_res.analysis_id, re_req, db_session, user)

    assert re_res.status == "REANALYZED"
    assert "CIS-1.2.1" in re_res.resolved_controls
    assert re_res.verification_status == "complete"

    # Post-reanalysis status
    status_post = await get_analysis_status(ingest_res.analysis_id, db_session, user)
    assert status_post.verification_status == "complete"
    assert status_post.status == "COMPLETED"


@pytest.mark.asyncio
async def test_k_and_l_real_evidence_line_citations_preserved(db_session: AsyncSession):
    """
    K & L:
    Ensure real configuration line citations are returned and zero 'Baseline' synthetic text exists.
    """
    user = AuthenticatedUser(id="user-evidence-citations", email="citations@netvigil.io", role="auditor", app_metadata={}, user_metadata={})
    p = BENCHMARKS_DIR / "05_JUNIPER_TELNET_ENABLED.set"
    content = p.read_text(encoding="utf-8")

    req = IngestAnalysisRequest(content=content, filename=p.name, vendor_hint="juniper")
    ingest_res = await ingest_configuration_for_analysis(req, db_session, user)

    findings = await get_analysis_findings(ingest_res.analysis_id, db_session, user)
    telnet_finding = next((f for f in findings if f.control_id in ["CIS-1.2.2", "STIG-NET-0002"]), None)
    assert telnet_finding is not None
    assert telnet_finding.status == "FAIL"

    # Must cite line 2 ("set system services telnet")
    assert any(ev.line == 2 for ev in telnet_finding.evidence_lines), "Finding must cite line 2."
    for ev in telnet_finding.evidence_lines:
        assert "Baseline" not in ev.raw_text, f"Forbidden 'Baseline' found in evidence: {ev.raw_text}"

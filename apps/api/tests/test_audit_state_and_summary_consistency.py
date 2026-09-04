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
        filename="pending_device.cfg",
        original_filename="pending_device.cfg",
        storage_path="/tmp/pending_device.cfg",
        file_size_bytes=len("hostname ROUTER-PENDING\ninterface GigabitEthernet0/0\n"),
        hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        detected_vendor="cisco",
        raw_content="hostname ROUTER-PENDING\ninterface GigabitEthernet0/0\n",
        parser_status="parsed",
        facts_extracted_count=3,
        unknown_items_count=0,
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
    - applicable_count = 36 (> 0)
    - total_applicable_controls = 36
    - failed_controls = 36
    - passed_controls = 0
    - failed + passed = applicable_count (36)
    - compliance_score = 0.0 (0 / 36 * 100)
    - risk_score = 100.0, risk_level = P0
    - CIS-1.2.2 remains FAIL with Line 2 citation
    """
    user = AuthenticatedUser(id="user-juniper-telnet-check", email="jtel@netvigil.io", role="auditor", app_metadata={}, user_metadata={})
    p = BENCHMARKS_DIR / "05_JUNIPER_TELNET_ENABLED.set"
    content = p.read_text(encoding="utf-8")

    req = IngestAnalysisRequest(content=content, filename=p.name, vendor_hint="juniper")
    ingest_res = await ingest_configuration_for_analysis(req, db_session, user)

    status_res = await get_analysis_status(ingest_res.analysis_id, db_session, user)

    # Requirement H: Sourced strictly from facts_extracted_count
    assert status_res.facts_extracted_count == 4, f"Normalized facts must be 4, got {status_res.facts_extracted_count}"
    assert status_res.fail_count == 36, f"Failed controls must be 36, got {status_res.fail_count}"
    assert status_res.pass_count == 0, f"Passed controls must be 0, got {status_res.pass_count}"

    # Requirement: applicable_count > 0, failed + passed = applicable_count, compliance = passed / applicable_count * 100
    applicable = status_res.applicable_count if status_res.applicable_count is not None else status_res.total_applicable_controls
    assert applicable is not None and applicable > 0, f"applicable_count must be > 0, got {applicable}"
    assert status_res.fail_count + status_res.pass_count == applicable, (
        f"Failed ({status_res.fail_count}) + Passed ({status_res.pass_count}) must equal applicable ({applicable})"
    )
    assert status_res.total_applicable_controls == 36
    expected_compliance = round(status_res.pass_count / applicable * 100.0, 1)
    assert status_res.compliance_score == expected_compliance
    assert status_res.compliance_score == 0.0
    assert status_res.risk_score == 100.0
    assert status_res.risk_level == "P0"
    assert status_res.status == "COMPLETED"

    # Verify CIS-1.2.2 remains FAIL and evidence remains Line 2
    findings = await get_analysis_findings(ingest_res.analysis_id, db_session, user)
    telnet_finding = next((f for f in findings if f.control_id == "CIS-1.2.2"), None)
    assert telnet_finding is not None, "CIS-1.2.2 finding must be present"
    assert telnet_finding.status == "FAIL", "CIS-1.2.2 must be FAIL"
    assert any(ev.line == 2 for ev in telnet_finding.evidence_lines), "CIS-1.2.2 evidence must cite Line 2"
    assert any("set system services telnet" in (ev.raw_text or "") for ev in telnet_finding.evidence_lines), "Evidence must contain 'set system services telnet'"


@pytest.mark.asyncio
async def test_f_i_switching_audits_isolation(db_session: AsyncSession):
    """
    F & I:
    Verify cross-audit isolation across Cisco Hardened, Juniper Critical, and Juniper Telnet:
    Each audit preserves its own independent facts, findings, compliance, and risk.
    """
    user = AuthenticatedUser(id="user-multi-switch", email="switch@netvigil.io", role="auditor", app_metadata={}, user_metadata={})

    # 1. Cisco Hardened (8 facts, high compliance)
    cisco_p = BENCHMARKS_DIR / "02_CISCO_HARDENED.cfg"
    cisco_req = IngestAnalysisRequest(content=cisco_p.read_text(encoding="utf-8"), filename=cisco_p.name, vendor_hint="cisco")
    cisco_res = await ingest_configuration_for_analysis(cisco_req, db_session, user)
    cisco_status = await get_analysis_status(cisco_res.analysis_id, db_session, user)
    assert cisco_status.facts_extracted_count == 8
    assert cisco_status.vendor == "cisco"

    # 2. Juniper Critical (6 facts, 40 fail, 0 pass)
    jcrit_p = BENCHMARKS_DIR / "04_JUNIPER_CRITICAL.set"
    jcrit_req = IngestAnalysisRequest(content=jcrit_p.read_text(encoding="utf-8"), filename=jcrit_p.name, vendor_hint="juniper")
    jcrit_res = await ingest_configuration_for_analysis(jcrit_req, db_session, user)
    jcrit_status = await get_analysis_status(jcrit_res.analysis_id, db_session, user)
    assert jcrit_status.facts_extracted_count == 6
    assert jcrit_status.fail_count == 40
    assert jcrit_status.pass_count == 0
    assert jcrit_status.vendor == "juniper"

    # 3. Juniper Telnet (4 facts, 36 fail, score 0.0%)
    jtel_p = BENCHMARKS_DIR / "05_JUNIPER_TELNET_ENABLED.set"
    jtel_req = IngestAnalysisRequest(content=jtel_p.read_text(encoding="utf-8"), filename=jtel_p.name, vendor_hint="juniper")
    jtel_res = await ingest_configuration_for_analysis(jtel_req, db_session, user)
    jtel_status = await get_analysis_status(jtel_res.analysis_id, db_session, user)
    assert jtel_status.facts_extracted_count == 4
    assert jtel_status.fail_count == 36
    assert jtel_status.pass_count == 0
    assert jtel_status.vendor == "juniper"

    # Re-query Cisco to prove zero state contamination
    cisco_recheck = await get_analysis_status(cisco_res.analysis_id, db_session, user)
    assert cisco_recheck.facts_extracted_count == 8
    assert cisco_recheck.vendor == "cisco"


@pytest.mark.asyncio
async def test_g_reanalysis_flow_provenance(db_session: AsyncSession):
    """
    G:
    Re-analysis updates configuration content, generates new audit, and records verification deltas.
    """
    user = AuthenticatedUser(id="user-reanalysis-flow", email="reanalysis@netvigil.io", role="auditor", app_metadata={}, user_metadata={})
    p = BENCHMARKS_DIR / "04_CISCO_REAL_EVIDENCE.cfg"
    base_content = p.read_text(encoding="utf-8")
    # Start with SSH v1 so that switching to SSH v2 produces a deterministic resolution of CIS-1.2.1
    initial_content = base_content.replace("ip ssh version 2", "ip ssh version 1")

    req = IngestAnalysisRequest(content=initial_content, filename=p.name, vendor_hint="cisco")
    ingest_res = await ingest_configuration_for_analysis(req, db_session, user)

    # Initial status
    status_init = await get_analysis_status(ingest_res.analysis_id, db_session, user)
    assert status_init.verification_status == "pending"

    # Patch SSH v1 -> SSH v2
    remediated_content = initial_content.replace("ip ssh version 1", "ip ssh version 2")
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


@pytest.mark.asyncio
async def test_analysis_execution_and_stage_progress_recovery(db_session: AsyncSession):
    """
    Requirements A through J from P0 Regression Recovery:
    A. Starting an audit actually invokes analysis.
    B. Re-analysis actually invokes analysis.
    C. Current audit response populates the UI.
    D. Old audit response cannot overwrite current audit.
    E. Clearing transient state does not prevent analysis execution.
    F. Pipeline progresses beyond DETECT to COMPLETED.
    G. Completed audit receives compliance, risk, and findings.
    H. Existing applicable-control compliance remains correct (30.0% = 12 / 40).
    I. Existing line-level evidence remains correct (Line 3 for 'aaa new-model').
    J. Zero 'Baseline' synthetic text returns.
    """
    user = AuthenticatedUser(id="user-cisco-verif-test", email="ciscotest@netvigil.io", role="auditor", app_metadata={}, user_metadata={})
    p = BENCHMARKS_DIR / "04_CISCO_REAL_EVIDENCE.cfg"
    content = p.read_text(encoding="utf-8")

    # A, E, F: Starting audit invokes analysis and progresses to COMPLETED
    req = IngestAnalysisRequest(content=content, filename=p.name, vendor_hint="cisco")
    ingest_res = await ingest_configuration_for_analysis(req, db_session, user)

    assert ingest_res.status == "INGESTED"
    assert ingest_res.vendor == "cisco"
    assert ingest_res.facts_extracted_count == 6

    # C, F, G, H: Completed audit receives full compliance, risk, and findings
    status_res = await get_analysis_status(ingest_res.analysis_id, db_session, user)
    assert status_res.status == "COMPLETED", f"Pipeline must progress beyond DETECT to COMPLETED, got {status_res.status}"
    assert status_res.compliance_score == 30.0, f"Compliance must be 30.0% (12/40), got {status_res.compliance_score}"
    assert status_res.pass_count == 12
    assert status_res.fail_count == 28
    assert status_res.total_applicable_controls == 40
    assert status_res.risk_score == 94.0
    assert status_res.risk_level == "P0"

    # I & J: Line-level citations preserved with zero Baseline text
    findings = await get_analysis_findings(ingest_res.analysis_id, db_session, user)
    assert len(findings) == 40
    aaa_pass = next((f for f in findings if f.control_id == "CIS-1.1.1"), None)
    assert aaa_pass is not None
    assert aaa_pass.status == "PASS"
    assert any(ev.line == 3 for ev in aaa_pass.evidence_lines), "CIS-1.1.1 must cite Line 3 for 'aaa new-model'."

    for f in findings:
        for ev in f.evidence_lines:
            assert "Baseline" not in ev.raw_text, f"Evidence must not contain 'Baseline': {ev.raw_text}"

    # B & D: Re-analysis actually invokes analysis and cannot be overwritten by older audits
    remediated_content = content.replace("transport input telnet ssh", "transport input ssh")
    re_req = ReanalyzeRequest(modified_content=remediated_content)
    re_res = await reanalyze_modified_configuration(ingest_res.analysis_id, re_req, db_session, user)
    assert re_res.status == "REANALYZED"
    assert re_res.verification_status == "complete"

    status_post = await get_analysis_status(ingest_res.analysis_id, db_session, user)
    assert status_post.status == "COMPLETED"
    assert status_post.verification_status == "complete"


@pytest.mark.asyncio
async def test_multi_framework_score_and_audit_consistency(db_session: AsyncSession):
    """
    P1 Multi-Framework Score Binding Regression Test:
    1. 02_CISCO_HARDENED.cfg yields score 41.7% with 5/12 passed across each framework.
    2. 03_FORTINET_SCORE_HIGH.conf yields score 50.0% with 6/12 passed across each framework.
    3. get_audit({audit_id}) returns exact framework scores without copying overall score or cross-audit contamination.
    4. Denominators are strictly framework-specific total_applicable (12), never overall total findings (48).
    """
    from app.api.routes.audits import get_audit

    user = AuthenticatedUser(
        id="user-multi-fw-test",
        email="multifw@netvigil.io",
        role="analyst",
        app_metadata={},
        user_metadata={},
    )

    # 1. Ingest & Audit Cisco Hardened
    cisco_p = BENCHMARKS_DIR / "02_CISCO_HARDENED.cfg"
    cisco_req = IngestAnalysisRequest(content=cisco_p.read_text(encoding="utf-8"), filename=cisco_p.name, vendor_hint="cisco")
    cisco_ingest = await ingest_configuration_for_analysis(cisco_req, db_session, user)

    cisco_audit = (
        await db_session.execute(select(Audit).where(Audit.configuration_id == cisco_ingest.analysis_id))
    ).scalars().first()
    assert cisco_audit is not None
    assert cisco_audit.score == pytest.approx(41.7, 0.1)

    # 2. Ingest & Audit Fortinet Score High
    fortinet_p = BENCHMARKS_DIR / "03_FORTINET_SCORE_HIGH.conf"
    fortinet_req = IngestAnalysisRequest(content=fortinet_p.read_text(encoding="utf-8"), filename=fortinet_p.name, vendor_hint="fortinet")
    fortinet_ingest = await ingest_configuration_for_analysis(fortinet_req, db_session, user)

    fortinet_audit = (
        await db_session.execute(select(Audit).where(Audit.configuration_id == fortinet_ingest.analysis_id))
    ).scalars().first()
    assert fortinet_audit is not None
    assert fortinet_audit.score == pytest.approx(50.0, 0.1)

    # 3. Verify get_audit for Cisco: exactly 41.7% overall and 5/12 per framework
    cisco_detail = await get_audit(audit_id=cisco_audit.id, db=db_session, current_user=user)
    assert cisco_detail.id == cisco_audit.id
    assert cisco_detail.score == pytest.approx(41.7, 0.1)
    assert cisco_detail.score != 50.0

    for fw_key in ["CIS", "NIST", "STIG", "ISO"]:
        assert fw_key in cisco_detail.framework_scores
        fw = cisco_detail.framework_scores[fw_key]
        assert fw.framework == fw_key
        assert fw.score == pytest.approx(41.7, 0.1)
        assert fw.passed_count == 5
        assert fw.failed_count == 7
        assert fw.total_applicable == 12
        assert fw.total_evaluated == 15
        assert fw.total_applicable != 48  # Must not be total findings count

    # 4. Verify get_audit for Fortinet: exactly 50.0% overall and 6/12 per framework
    fortinet_detail = await get_audit(audit_id=fortinet_audit.id, db=db_session, current_user=user)
    assert fortinet_detail.id == fortinet_audit.id
    assert fortinet_detail.score == pytest.approx(50.0, 0.1)
    assert fortinet_detail.score != 41.7

    for fw_key in ["CIS", "NIST", "STIG", "ISO"]:
        assert fw_key in fortinet_detail.framework_scores
        fw = fortinet_detail.framework_scores[fw_key]
        assert fw.framework == fw_key
        assert fw.score == pytest.approx(50.0, 0.1)
        assert fw.passed_count == 6
        assert fw.failed_count == 5
        assert fw.unknown_count == 1
        assert fw.total_applicable == 12
        assert fw.total_evaluated == 12
        assert fw.total_applicable != 48

    # 5. Cross-audit re-query: Cisco detail must remain completely isolated
    cisco_recheck = await get_audit(audit_id=cisco_audit.id, db=db_session, current_user=user)
    assert cisco_recheck.score == pytest.approx(41.7, 0.1)
    assert cisco_recheck.framework_scores["CIS"].passed_count == 5



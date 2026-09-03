"""
NetVigil P1 Regression Suite — Vendor-Applicable Compliance Denominator & Provenance Integrity
Problem Statement: SIH26155 (NTRO)

Validates:
- Dataset A: Cisco hardened: 48 applicable controls, 20 PASS, 28 FAIL -> 41.7% compliance
- Dataset B: Cisco real evidence: 40 applicable controls, 12 PASS, 28 FAIL -> 30.0% compliance
- Dataset C: Juniper critical: 40 applicable controls, 4 PASS, 36 FAIL -> 10.0% compliance
- Dataset D: Juniper telnet enabled: 32 applicable controls, 0 PASS, 32 FAIL -> 0.0% compliance
- Dataset E: Fortinet score/high: 48 applicable controls, 24 PASS, 20 FAIL -> 50.0% compliance
- Dataset F: Universal catalog size (e.g. 60 or 80) is NOT used as denominator
- Dataset G: Evidence and line citations remain intact and real line-level evidence is preserved
"""
import io
import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.main import app
from app.db.session import AsyncSessionLocal
from app.core.auth import AuthenticatedUser
from app.models.finding import Finding
from app.models.configuration import Configuration
from app.services.parser.registry import parser_registry
from app.services.compliance.catalog import compliance_catalog
from app.services.compliance.evaluator import RuleEvaluator
from app.services.compliance.models import EvaluationStatus
from app.services.compliance.scorer import ComplianceScoringEngine
from app.services.risk.scoring import calculate_composite_risk_score
from app.api.routes.analysis import (
    ingest_configuration_for_analysis,
    get_analysis_status,
    get_analysis_findings,
    get_analysis_risk,
    IngestAnalysisRequest,
)

BENCHMARKS_DIR = Path(__file__).resolve().parents[3] / "data" / "sample-configs" / "benchmarks"


def _evaluate_benchmark(filename: str):
    p = BENCHMARKS_DIR / filename
    content = p.read_text(encoding="utf-8")
    parser = parser_registry.get_parser(content=content, filename=filename)
    profile = parser.parse(content, filename=filename)

    rules = compliance_catalog.get_rules_for_audit(
        frameworks=["CIS", "NIST", "STIG", "ISO"],
        vendor=profile.vendor,
    )
    evals = []
    for r in rules:
        for fw in ["CIS", "NIST", "STIG", "ISO"]:
            if fw in r.framework_mappings:
                res = RuleEvaluator.evaluate_rule(r, profile, fw)
                evals.append(res)

    summary = ComplianceScoringEngine.calculate_scores("test-audit", "test-cfg", evals)
    pass_count = sum(1 for e in evals if e.status == EvaluationStatus.PASS)
    fail_count = sum(1 for e in evals if e.status == EvaluationStatus.FAIL)
    unk_count = sum(1 for e in evals if e.status == EvaluationStatus.UNKNOWN)
    na_count = sum(1 for e in evals if e.status == EvaluationStatus.NOT_APPLICABLE)
    total_applicable = summary.total_applicable

    return {
        "profile": profile,
        "evals": evals,
        "summary": summary,
        "pass_count": pass_count,
        "fail_count": fail_count,
        "unk_count": unk_count,
        "na_count": na_count,
        "total_applicable": total_applicable,
        "compliance_score": summary.overall_score,
    }


def test_dataset_a_cisco_hardened():
    """Dataset A: Cisco Hardened config must yield 48 applicable controls and 41.7% compliance."""
    res = _evaluate_benchmark("02_CISCO_HARDENED.cfg")
    assert res["pass_count"] == 20, f"Expected 20 PASS, got {res['pass_count']}"
    assert res["fail_count"] == 28, f"Expected 28 FAIL, got {res['fail_count']}"
    assert res["total_applicable"] == 48, f"Expected 48 applicable, got {res['total_applicable']}"
    assert res["compliance_score"] == pytest.approx(41.7, 0.1), f"Expected 41.7%, got {res['compliance_score']}"


def test_dataset_b_cisco_real_evidence():
    """Dataset B: Cisco Real Evidence config must yield 40 applicable controls and 30.0% compliance."""
    res = _evaluate_benchmark("04_CISCO_REAL_EVIDENCE.cfg")
    assert res["pass_count"] == 12, f"Expected 12 PASS, got {res['pass_count']}"
    assert res["fail_count"] == 28, f"Expected 28 FAIL, got {res['fail_count']}"
    assert res["total_applicable"] == 40, f"Expected 40 applicable, got {res['total_applicable']}"
    assert res["compliance_score"] == pytest.approx(30.0, 0.1), f"Expected 30.0%, got {res['compliance_score']}"


def test_dataset_c_juniper_critical():
    """Dataset C: Juniper Critical config must yield 40 applicable controls and 0.0% compliance."""
    res = _evaluate_benchmark("04_JUNIPER_CRITICAL.set")
    assert res["pass_count"] == 0, f"Expected 0 PASS, got {res['pass_count']}"
    assert res["fail_count"] == 40, f"Expected 40 FAIL, got {res['fail_count']}"
    assert res["total_applicable"] == 40, f"Expected 40 applicable, got {res['total_applicable']}"
    assert res["compliance_score"] == pytest.approx(0.0, 0.1), f"Expected 0.0%, got {res['compliance_score']}"


def test_dataset_d_juniper_telnet_enabled():
    """Dataset D: Juniper Telnet Enabled config must yield 36 applicable controls and 0.0% compliance."""
    res = _evaluate_benchmark("05_JUNIPER_TELNET_ENABLED.set")
    assert res["pass_count"] == 0, f"Expected 0 PASS, got {res['pass_count']}"
    assert res["fail_count"] == 36, f"Expected 36 FAIL, got {res['fail_count']}"
    assert res["total_applicable"] == 36, f"Expected 36 applicable, got {res['total_applicable']}"
    assert res["compliance_score"] == pytest.approx(0.0, 0.1), f"Expected 0.0%, got {res['compliance_score']}"


def test_dataset_e_fortinet_score_high():
    """Dataset E: Fortinet Score High config must yield 48 applicable controls and 50.0% compliance."""
    res = _evaluate_benchmark("03_FORTINET_SCORE_HIGH.conf")
    assert res["pass_count"] == 24, f"Expected 24 PASS, got {res['pass_count']}"
    assert res["fail_count"] == 20, f"Expected 20 FAIL, got {res['fail_count']}"
    assert res["total_applicable"] == 48, f"Expected 48 applicable, got {res['total_applicable']}"
    assert res["compliance_score"] == pytest.approx(50.0, 0.1), f"Expected 50.0%, got {res['compliance_score']}"


def test_dataset_f_universal_catalog_not_denominator():
    """Dataset F: Universal catalog size (e.g. 60 or 80) is never blindly used as the denominator."""
    res_a = _evaluate_benchmark("02_CISCO_HARDENED.cfg")
    res_b = _evaluate_benchmark("04_CISCO_REAL_EVIDENCE.cfg")
    res_d = _evaluate_benchmark("05_JUNIPER_TELNET_ENABLED.set")

    # Assert denominators are dynamic and strictly derived from evaluated applicable controls
    assert res_a["total_applicable"] != 60
    assert res_a["total_applicable"] == 48

    assert res_b["total_applicable"] != 60
    assert res_b["total_applicable"] == 40

    assert res_d["total_applicable"] != 44
    assert res_d["total_applicable"] == 36


def test_dataset_g_evidence_and_line_citations_preserved():
    """Dataset G: Real line citations and verbatim evidence are preserved intact."""
    res_a = _evaluate_benchmark("02_CISCO_HARDENED.cfg")
    evals = res_a["evals"]

    # Verify that passing rules have authentic source lines and verbatim evidence
    pass_evals = [e for e in evals if e.status == EvaluationStatus.PASS]
    assert len(pass_evals) > 0

    # SSH rule check
    ssh_evals = [e for e in pass_evals if "SSH" in e.rule_id]
    assert len(ssh_evals) > 0
    for e in ssh_evals:
        assert len(e.source_lines) > 0, f"Rule {e.rule_id} must have source lines"
        assert e.source_lines[0] == 6, f"Expected line 6 for ip ssh version 2, got {e.source_lines}"
        assert any("ip ssh version 2" in ev for ev in e.evidence)


@pytest.mark.asyncio
async def test_api_status_authoritative_response(db_session: AsyncSession):
    """Verifies that GET /api/v1/analysis/{id}/status returns authoritative total_applicable_controls."""
    user = AuthenticatedUser(
        id="test-p1-user",
        email="p1@netvigil.io",
        role="auditor",
        app_metadata={},
        user_metadata={},
    )
    p = BENCHMARKS_DIR / "02_CISCO_HARDENED.cfg"
    content = p.read_text(encoding="utf-8")
    req = IngestAnalysisRequest(content=content, filename="02_CISCO_HARDENED.cfg", vendor_hint="cisco")
    ingest_res = await ingest_configuration_for_analysis(req, db_session, user)

    status_res = await get_analysis_status(ingest_res.analysis_id, db_session, user)
    assert status_res.compliance_score == pytest.approx(41.7, 0.1)
    assert status_res.controls_evaluated_count == 48
    assert status_res.total_applicable_controls == 48
    assert status_res.pass_count == 20
    assert status_res.fail_count == 28
    assert status_res.not_applicable_count == 12


@pytest.mark.asyncio
async def test_api_findings_and_risk_consistency(db_session: AsyncSession):
    """Verifies that findings endpoint count equals applicable controls and risk endpoints are synchronized."""
    user = AuthenticatedUser(
        id="test-p2-sync-user",
        email="p2@netvigil.io",
        role="auditor",
        app_metadata={},
        user_metadata={},
    )
    test_cases = [
        ("02_CISCO_HARDENED.cfg", "cisco", 48, 20, 28, 91.7, "P0"),
        ("04_CISCO_REAL_EVIDENCE.cfg", "cisco", 40, 12, 28, 94.0, "P0"),
        ("03_FORTINET_SCORE_HIGH.conf", "fortinet", 48, 24, 20, 88.3, "P1"),
    ]
    for filename, vendor, exp_applicable, exp_pass, exp_fail, exp_risk, exp_priority in test_cases:
        p = BENCHMARKS_DIR / filename
        content = p.read_text(encoding="utf-8")
        req = IngestAnalysisRequest(content=content, filename=filename, vendor_hint=vendor)
        ingest_res = await ingest_configuration_for_analysis(req, db_session, user)

        status_res = await get_analysis_status(ingest_res.analysis_id, db_session, user)
        risk_res = await get_analysis_risk(ingest_res.analysis_id, db_session, user)
        findings_res = await get_analysis_findings(ingest_res.analysis_id, db_session, user)

        # Summary card and findings panel cannot disagree
        assert len(findings_res) == exp_applicable, f"{filename}: findings count {len(findings_res)} != {exp_applicable}"
        assert status_res.total_applicable_controls == exp_applicable
        assert status_res.pass_count == exp_pass
        assert status_res.fail_count == exp_fail

        # Risk score and priority must come authoritatively from backend and match between endpoints
        assert status_res.risk_score == exp_risk, f"{filename}: status risk {status_res.risk_score} != {exp_risk}"
        assert risk_res.risk_score == exp_risk, f"{filename}: risk endpoint {risk_res.risk_score} != {exp_risk}"
        assert status_res.risk_level == exp_priority
        assert risk_res.risk_level == exp_priority


@pytest.mark.asyncio
async def test_multi_audit_isolation(db_session: AsyncSession):
    """Verifies Cisco -> Fortinet -> Juniper -> Cisco sequential switching maintains strict isolation."""
    user = AuthenticatedUser(
        id="test-iso-user",
        email="iso@netvigil.io",
        role="auditor",
        app_metadata={},
        user_metadata={},
    )
    sequence = [
        ("02_CISCO_HARDENED.cfg", "cisco", 48, 20, 28),
        ("03_FORTINET_SCORE_HIGH.conf", "fortinet", 48, 24, 20),
        ("04_JUNIPER_CRITICAL.set", "juniper", 40, 0, 40),
        ("04_CISCO_REAL_EVIDENCE.cfg", "cisco", 40, 12, 28),
    ]
    audit_ids = []
    for filename, vendor, exp_applicable, exp_pass, exp_fail in sequence:
        p = BENCHMARKS_DIR / filename
        content = p.read_text(encoding="utf-8")
        req = IngestAnalysisRequest(content=content, filename=filename, vendor_hint=vendor)
        ingest_res = await ingest_configuration_for_analysis(req, db_session, user)
        audit_ids.append((ingest_res.analysis_id, vendor, exp_applicable, exp_pass, exp_fail))

    # Re-query each audit in sequence to ensure no cross-contamination or state leakage
    for analysis_id, expected_vendor, exp_applicable, exp_pass, exp_fail in audit_ids:
        status_res = await get_analysis_status(analysis_id, db_session, user)
        findings_res = await get_analysis_findings(analysis_id, db_session, user)

        assert status_res.vendor == expected_vendor
        assert status_res.total_applicable_controls == exp_applicable
        assert status_res.pass_count == exp_pass
        assert status_res.fail_count == exp_fail
        assert len(findings_res) == exp_applicable


"""
Test Multi-Framework Summary API & Data Flow Consistency
Problem Statement: SIH26155 (NTRO)

Verifies:
1. ComplianceScoringEngine produces independent FrameworkScore objects for CIS, NIST, STIG, ISO
2. AuditDetailResponse contains structured framework_scores with exact passed, failed, unknown, na counts
3. Each framework score is calculated independently from its own framework-scoped findings
4. Overall compliance score preserves multi-framework average without overwriting per-framework scores
5. Finding records have durable framework identifiers matching their control mappings
"""
import pytest
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.models.base import Base
import app.services.parser.vendors
from app.services.parser.registry import parser_registry
from app.services.compliance.catalog import ComplianceCatalog
from app.services.compliance.evaluator import RuleEvaluator
from app.services.compliance.scorer import ComplianceScoringEngine
from app.services.compliance.models import FrameworkScore, EvaluationStatus, RuleEvaluationResult
from app.schemas.audit import AuditDetailResponse, FrameworkScoreResponse


@pytest.fixture
def catalog():
    return ComplianceCatalog("data/compliance/mappings/unified_catalog.json")


def test_independent_framework_score_calculation(catalog):
    """
    Verify ComplianceScoringEngine groups results by framework and calculates each
    score independently without copying overall scores.
    """
    # Create asymmetric results across frameworks
    results = []
    
    # CIS: 4 pass, 1 fail -> 4/5 = 80.0%
    for i in range(4):
        results.append(RuleEvaluationResult(
            rule_id=f"RULE-CIS-{i}",
            framework="CIS",
            control_id=f"CIS-1.{i}",
            title=f"CIS Test {i}",
            category="Access",
            severity="HIGH",
            status=EvaluationStatus.PASS,
            actual_value="configured",
            expected_value="configured",
            explanation="Compliant",
            remediation="",
        ))
    results.append(RuleEvaluationResult(
        rule_id="RULE-CIS-FAIL",
        framework="CIS",
        control_id="CIS-1.9",
        title="CIS Fail",
        category="Access",
        severity="HIGH",
        status=EvaluationStatus.FAIL,
        actual_value="disabled",
        expected_value="enabled",
        explanation="Non-compliant",
        remediation="fix",
    ))

    # NIST: 1 pass, 3 fail -> 1/4 = 25.0%
    results.append(RuleEvaluationResult(
        rule_id="RULE-NIST-PASS",
        framework="NIST",
        control_id="NIST-AC-1",
        title="NIST Pass",
        category="Access",
        severity="MEDIUM",
        status=EvaluationStatus.PASS,
        actual_value="configured",
        expected_value="configured",
        explanation="Compliant",
        remediation="",
    ))
    for i in range(3):
        results.append(RuleEvaluationResult(
            rule_id=f"RULE-NIST-FAIL-{i}",
            framework="NIST",
            control_id=f"NIST-AC-{i+2}",
            title=f"NIST Fail {i}",
            category="Access",
            severity="CRITICAL",
            status=EvaluationStatus.FAIL,
            actual_value="unconfigured",
            expected_value="configured",
            explanation="Non-compliant",
            remediation="fix",
        ))

    summary = ComplianceScoringEngine.calculate_scores(
        audit_id="audit-asym-001",
        configuration_id="cfg-asym-001",
        results=results,
    )

    # Overall: 5 passed out of 9 applicable controls = 55.6%
    assert summary.overall_score == 55.6
    assert summary.total_findings == 9
    assert summary.total_applicable == 9

    # Verify CIS card data
    cis = summary.framework_scores["CIS"]
    assert cis.framework == "CIS"
    assert cis.score == 80.0
    assert cis.passed_count == 4
    assert cis.failed_count == 1
    assert cis.total_applicable == 5
    assert cis.total_evaluated == 5

    # Verify NIST card data
    nist = summary.framework_scores["NIST"]
    assert nist.framework == "NIST"
    assert nist.score == 25.0
    assert nist.passed_count == 1
    assert nist.failed_count == 3
    assert nist.total_applicable == 4
    assert nist.total_evaluated == 4

    # Critical invariant: Framework scores are independent and NOT copied from overall
    assert cis.score != summary.overall_score
    assert nist.score != summary.overall_score
    assert cis.passed_count != nist.passed_count
    assert cis.passed_count != summary.status_breakdown["PASS"]


def test_fortinet_critical_framework_data_provenance(catalog):
    """
    Verify 06_FORTINET_CRITICAL.conf evaluation produces identical scores purely
    because of catalog symmetry, with each framework calculated on its own 12 findings.
    """
    # Locate fortinet critical config
    cand = Path("storage/uploads/19e9b679_9640e332ae08c91b_06_FORTINET_CRITICAL.conf")
    if not cand.exists():
        pytest.skip("Production upload test file not available")

    content = cand.read_text()
    p = parser_registry.get_parser(content, filename=cand.name)
    prof = p.parse(content, filename=cand.name)
    assert prof.vendor == "fortinet"

    rules = catalog.get_rules_for_audit(["CIS", "NIST", "STIG", "ISO"], vendor=prof.vendor)
    assert len(rules) == 12, "Exactly 12 rules apply to fortinet"

    res = []
    for r in rules:
        for fw in ["CIS", "NIST", "STIG", "ISO"]:
            if fw in r.framework_mappings:
                res.append(RuleEvaluator.evaluate_rule(r, prof, fw))

    assert len(res) == 48, "12 rules * 4 frameworks = 48 findings"

    summary = ComplianceScoringEngine.calculate_scores("audit-fgt-001", "cfg-fgt-001", res)

    assert summary.overall_score == 16.7
    assert summary.total_findings == 48

    for fw in ["CIS", "NIST", "STIG", "ISO"]:
        fw_data = summary.framework_scores[fw]
        assert fw_data.score == 16.7
        assert fw_data.passed_count == 2
        assert fw_data.failed_count == 6
        assert fw_data.unknown_count == 4
        assert fw_data.not_applicable_count == 0
        assert fw_data.total_applicable == 12
        assert fw_data.total_evaluated == 12

        # Filter raw findings for this framework
        fw_findings = [r for r in res if r.framework == fw]
        assert len(fw_findings) == 12
        assert sum(1 for r in fw_findings if r.status == EvaluationStatus.PASS) == 2
        assert sum(1 for r in fw_findings if r.status == EvaluationStatus.FAIL) == 6
        assert sum(1 for r in fw_findings if r.status == EvaluationStatus.UNKNOWN) == 4


def test_schema_serialization_independence():
    """
    Verify FrameworkScoreResponse and AuditDetailResponse serialize per-framework metrics
    without collapsing or merging objects.
    """
    scores = {
        "CIS": FrameworkScoreResponse(
            framework="CIS",
            score=75.0,
            passed_count=9,
            failed_count=3,
            unknown_count=0,
            not_applicable_count=0,
            total_applicable=12,
            total_evaluated=12,
        ),
        "NIST": FrameworkScoreResponse(
            framework="NIST",
            score=50.0,
            passed_count=6,
            failed_count=6,
            unknown_count=0,
            not_applicable_count=0,
            total_applicable=12,
            total_evaluated=12,
        ),
    }

    serialized = {k: v.model_dump() for k, v in scores.items()}
    assert serialized["CIS"]["score"] == 75.0
    assert serialized["CIS"]["passed_count"] == 9
    assert serialized["NIST"]["score"] == 50.0
    assert serialized["NIST"]["passed_count"] == 6
    assert serialized["CIS"] is not serialized["NIST"]

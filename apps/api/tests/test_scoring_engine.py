"""
Compliance Scoring Engine Unit Tests
"""
from app.services.compliance.models import (
    EvaluationStatus,
    RuleEvaluationResult,
    SeverityLevel,
)
from app.services.compliance.scorer import ComplianceScoringEngine


def test_scoring_engine_all_pass():
    results = [
        RuleEvaluationResult(
            rule_id=f"R-{i}",
            framework="CIS",
            control_id=f"CIS-{i}",
            title=f"Control {i}",
            category="Remote",
            severity=SeverityLevel.HIGH,
            status=EvaluationStatus.PASS,
            actual_value=True,
            expected_value=True,
            explanation="OK",
            remediation="None",
        )
        for i in range(10)
    ]

    summary = ComplianceScoringEngine.calculate_scores("audit-1", "config-1", results)
    assert summary.overall_score == 100.0
    assert summary.framework_scores["CIS"].score == 100.0
    assert summary.framework_scores["CIS"].passed_count == 10
    assert summary.framework_scores["CIS"].failed_count == 0


def test_scoring_engine_mixed_with_not_applicable_and_unknown():
    results = [
        # 6 Pass
        RuleEvaluationResult(
            rule_id="R-1",
            framework="CIS",
            control_id="CIS-1",
            title="C1",
            category="Auth",
            severity=SeverityLevel.HIGH,
            status=EvaluationStatus.PASS,
            actual_value=True,
            expected_value=True,
            explanation="",
            remediation="",
        ),
        # 2 Fail
        RuleEvaluationResult(
            rule_id="R-2",
            framework="CIS",
            control_id="CIS-2",
            title="C2",
            category="Auth",
            severity=SeverityLevel.CRITICAL,
            status=EvaluationStatus.FAIL,
            actual_value=False,
            expected_value=True,
            explanation="",
            remediation="",
        ),
        # 2 Unknown (penalizes score)
        RuleEvaluationResult(
            rule_id="R-3",
            framework="CIS",
            control_id="CIS-3",
            title="C3",
            category="Auth",
            severity=SeverityLevel.MEDIUM,
            status=EvaluationStatus.UNKNOWN,
            actual_value=None,
            expected_value=True,
            explanation="",
            remediation="",
        ),
        # 2 Not Applicable (excluded from denominator)
        RuleEvaluationResult(
            rule_id="R-4",
            framework="CIS",
            control_id="CIS-4",
            title="C4",
            category="Auth",
            severity=SeverityLevel.LOW,
            status=EvaluationStatus.NOT_APPLICABLE,
            actual_value="N/A",
            expected_value="N/A",
            explanation="",
            remediation="",
        ),
    ]

    summary = ComplianceScoringEngine.calculate_scores("audit-2", "config-2", results)
    # Applicable = 1 PASS + 1 FAIL + 1 UNKNOWN = 3
    # Score = 1 / 3 * 100 = 33.3%
    assert summary.framework_scores["CIS"].total_applicable == 3
    assert summary.framework_scores["CIS"].score == 33.3
    assert summary.framework_scores["CIS"].not_applicable_count == 1
    assert summary.severity_breakdown.critical == 1

"""
Rule Evaluator Unit Tests
Problem Statement: SIH26155 (NTRO)
"""
from app.services.compliance.evaluator import RuleEvaluator
from app.services.compliance.models import (
    ComplianceRule,
    EvaluationStatus,
    FrameworkSourceMeta,
    SeverityLevel,
)
from app.services.parser.models import NormalizedSecurityProfile, SecurityFact


def test_rule_evaluator_equals_operator():
    profile = NormalizedSecurityProfile(
        vendor="cisco",
        parser_name="test",
        parser_version="1.0",
    )
    profile.remote_access.ssh_version = SecurityFact.create(2, ["ip ssh version 2"], [10])

    rule = ComplianceRule(
        id="RULE-SSH-001",
        normalized_control_id="NETSEC-SSH",
        title="SSH v2",
        description="SSH v2",
        category="Remote Access",
        severity=SeverityLevel.HIGH,
        fact_path="remote_access.ssh_version.value",
        operator="equals",
        expected_value=2,
        explanation="Test explanation",
        remediation_key="remediate_ssh",
        framework_mappings={
            "CIS": FrameworkSourceMeta(
                control_id="CIS-1.2.1",
                title="CIS SSH",
                document="CIS Benchmark",
                version="v2.0",
                reference="1.2.1",
            )
        },
    )

    result = RuleEvaluator.evaluate_rule(rule, profile, "CIS")
    assert result.status == EvaluationStatus.PASS
    assert result.actual_value == 2
    assert result.expected_value == 2
    assert "ip ssh version 2" in result.evidence
    assert result.source_lines == [10]


def test_rule_evaluator_is_false_operator_failure():
    profile = NormalizedSecurityProfile(
        vendor="cisco",
        parser_name="test",
        parser_version="1.0",
    )
    profile.remote_access.telnet_enabled = SecurityFact.create(True, ["transport input telnet"], [42])

    rule = ComplianceRule(
        id="RULE-TELNET-001",
        normalized_control_id="NETSEC-TELNET",
        title="Disable Telnet",
        description="Disable Telnet",
        category="Remote Access",
        severity=SeverityLevel.CRITICAL,
        fact_path="remote_access.telnet_enabled.value",
        operator="is_false",
        expected_value=False,
        explanation="Telnet transmits credentials in cleartext",
        remediation_key="disable_telnet",
    )

    result = RuleEvaluator.evaluate_rule(rule, profile, "CIS")
    assert result.status == EvaluationStatus.FAIL
    assert result.actual_value is True
    assert result.expected_value is False
    assert result.severity == SeverityLevel.CRITICAL


def test_rule_evaluator_unknown_fact_handling():
    profile = NormalizedSecurityProfile(
        vendor="cisco",
        parser_name="test",
        parser_version="1.0",
    )
    # Fact status marked as unknown / unresolved
    profile.remote_access.ssh_version = SecurityFact(
        value=1,
        evidence=[],
        source_lines=[],
        confidence=0.0,
        status="unknown",
    )

    rule = ComplianceRule(
        id="RULE-SSH-001",
        normalized_control_id="NETSEC-SSH",
        title="SSH v2",
        description="SSH v2",
        category="Remote Access",
        severity=SeverityLevel.HIGH,
        fact_path="remote_access.ssh_version.value",
        operator="equals",
        expected_value=2,
        explanation="Test",
        remediation_key="remediate_ssh",
    )

    result = RuleEvaluator.evaluate_rule(rule, profile, "CIS")
    assert result.status == EvaluationStatus.UNKNOWN

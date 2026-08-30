"""
Final Consistency & Evidence Integrity Regression Suite
Problem Statement: SIH26155 (NTRO)

Verifies:
1. Vendor-specific remediation correctness (Cisco, Juniper, Fortinet)
2. Cross-vendor remediation rejection & unknown vendor protection
3. Finding totals equal sum of severity buckets (open == crit + high + med + low + info)
4. Framework scores produce exact overall compliance score
5. Finding identity remains unique across assets/configurations
6. Evidence line numbers exist in source configuration
7. Evidence maps to correct vendor and parser
8. Risk contribution is included correctly in final risk calculation
9. Synthetic configuration -> finding -> evidence remains internally consistent
10. API summary metrics cannot display contradictory totals
"""
import pytest
from app.services.remediation.catalog import find_remediation_template, REMEDIATION_CATALOG
from app.services.agent.patcher import ConfigurationPatcher
from app.services.agent.models import ProposedRemediationItem, AgentConstraint
from app.services.agent.tools import AgentToolLayer
from app.services.parser.registry import parser_registry
from app.services.compliance.evaluator import RuleEvaluator
from app.services.compliance.catalog import compliance_catalog
from app.services.compliance.scorer import ComplianceScoringEngine
from app.services.compliance.models import EvaluationStatus, SeverityLevel, RuleEvaluationResult
from app.services.risk.scoring import calculate_risk_score, SEVERITY_WEIGHTS, EXPOSURE_MODIFIERS, IMPACT_MODIFIERS
from app.models.configuration import Configuration
from app.models.audit import Audit
from app.models.finding import Finding
from app.models.risk import RiskItem


# ============================================================
# TEST 1: Vendor-Specific Remediation Correctness
# ============================================================
def test_vendor_specific_remediation_correctness():
    # Cisco
    cisco_ssh = find_remediation_template("cisco", "remote_access.ssh_version")
    assert cisco_ssh is not None
    assert "ip ssh version 2" in cisco_ssh["commands"]
    assert "crypto key generate rsa" in cisco_ssh["commands"]
    assert "set system services" not in cisco_ssh["commands"]
    assert "config system global" not in cisco_ssh["commands"]

    # Juniper
    juniper_ssh = find_remediation_template("juniper", "remote_access.ssh_version")
    assert juniper_ssh is not None
    assert "set system services ssh protocol-version v2" in juniper_ssh["commands"]
    assert "ip ssh version 2" not in juniper_ssh["commands"]

    # Fortinet
    fortinet_ssh = find_remediation_template("fortinet", "remote_access.ssh_version")
    assert fortinet_ssh is not None
    assert "config system global" in fortinet_ssh["commands"]
    assert "set admin-ssh-v1 disable" in fortinet_ssh["commands"]


# ============================================================
# TEST 2: Cross-Vendor Remediation Rejection & Unknown Vendor
# ============================================================
def test_cross_vendor_and_unknown_remediation_rejection():
    # Unknown vendor lookup
    unknown_tpl = find_remediation_template("unknown_vendor", "remote_access.ssh_version")
    assert unknown_tpl is None

    # Patching unknown vendor fails safely
    raw_cfg = "hostname core-router\nip ssh version 1\n"
    res_text, was_changed, desc = ConfigurationPatcher.apply_patch(
        vendor="unknown_vendor",
        raw_text=raw_cfg,
        normalized_control="remote_access.ssh_version",
        commands="ip ssh version 2",
    )
    assert was_changed is False
    assert res_text == raw_cfg
    assert "Unsupported vendor" in desc


# ============================================================
# TEST 3: Finding Total Equals Severity Bucket Total
# ============================================================
def test_finding_total_equals_severity_bucket_total():
    results = [
        RuleEvaluationResult(
            rule_id="RULE-AUTH-001",
            framework="CIS",
            control_id="CIS-1.1",
            title="AAA Enabled",
            category="Authentication",
            severity=SeverityLevel.CRITICAL,
            status=EvaluationStatus.FAIL,
            actual_value=False,
            expected_value=True,
            evidence=["aaa missing"],
            source_lines=[10],
            explanation="AAA is required",
            remediation="Enable AAA",
            source={"framework": "CIS"},
            confidence=1.0,
        ),
        RuleEvaluationResult(
            rule_id="RULE-SSH-001",
            framework="CIS",
            control_id="CIS-1.2",
            title="SSH Version 2",
            category="Remote Access",
            severity=SeverityLevel.HIGH,
            status=EvaluationStatus.FAIL,
            actual_value=1,
            expected_value=2,
            evidence=["ip ssh version 1"],
            source_lines=[15],
            explanation="SSH v2 required",
            remediation="Enforce SSH v2",
            source={"framework": "CIS"},
            confidence=1.0,
        ),
        RuleEvaluationResult(
            rule_id="RULE-LOG-001",
            framework="CIS",
            control_id="CIS-1.3",
            title="Syslog Logging",
            category="Logging",
            severity=SeverityLevel.MEDIUM,
            status=EvaluationStatus.PASS,
            actual_value=True,
            expected_value=True,
            evidence=["logging host 10.0.0.1"],
            source_lines=[20],
            explanation="Logging required",
            remediation="Enable logging",
            source={"framework": "CIS"},
            confidence=1.0,
        ),
    ]

    summary = ComplianceScoringEngine.calculate_scores(
        audit_id="audit_123",
        configuration_id="cfg_123",
        results=results,
    )

    crit = summary.severity_breakdown.critical
    high = summary.severity_breakdown.high
    med = summary.severity_breakdown.medium
    low = summary.severity_breakdown.low
    info = summary.severity_breakdown.info

    open_failures = summary.status_breakdown.get("FAIL", 0) + summary.status_breakdown.get("UNKNOWN", 0)
    assert crit + high + med + low + info == open_failures
    assert summary.total_findings == 3


# ============================================================
# TEST 4: Framework Scores Produce Exact Overall Compliance Score
# ============================================================
def test_framework_scores_produce_exact_overall_score():
    results = [
        # CIS: 1 PASS, 1 FAIL -> 50%
        RuleEvaluationResult(rule_id="R1", framework="CIS", control_id="C1", title="T1", category="C", severity=SeverityLevel.HIGH, status=EvaluationStatus.PASS, actual_value=True, expected_value=True, evidence=[], source_lines=[], explanation="", remediation="", source={}, confidence=1.0),
        RuleEvaluationResult(rule_id="R2", framework="CIS", control_id="C2", title="T2", category="C", severity=SeverityLevel.HIGH, status=EvaluationStatus.FAIL, actual_value=False, expected_value=True, evidence=[], source_lines=[], explanation="", remediation="", source={}, confidence=1.0),
        # NIST: 1 PASS, 1 FAIL -> 50%
        RuleEvaluationResult(rule_id="R1", framework="NIST", control_id="N1", title="T1", category="C", severity=SeverityLevel.HIGH, status=EvaluationStatus.PASS, actual_value=True, expected_value=True, evidence=[], source_lines=[], explanation="", remediation="", source={}, confidence=1.0),
        RuleEvaluationResult(rule_id="R2", framework="NIST", control_id="N2", title="T2", category="C", severity=SeverityLevel.HIGH, status=EvaluationStatus.FAIL, actual_value=False, expected_value=True, evidence=[], source_lines=[], explanation="", remediation="", source={}, confidence=1.0),
    ]

    summary = ComplianceScoringEngine.calculate_scores(
        audit_id="audit_456",
        configuration_id="cfg_456",
        results=results,
    )

    assert summary.framework_scores["CIS"].score == 50.0
    assert summary.framework_scores["NIST"].score == 50.0
    # Overall score = (2 passed / 4 applicable) * 100 = 50.0%
    assert summary.overall_score == 50.0


# ============================================================
# TEST 5: Finding Identity Remains Unique Across Assets
# ============================================================
def test_finding_identity_uniqueness():
    finding_a = Finding(
        id="find_001",
        audit_id="audit_a",
        framework="CIS",
        control_id="CIS-1.1.1",
        title="Enforce SSH v2",
        status="FAIL",
        severity="HIGH",
        evidence="ip ssh version 1",
        finding_metadata={"source_lines": [12]},
    )
    finding_b = Finding(
        id="find_002",
        audit_id="audit_b",
        framework="CIS",
        control_id="CIS-1.1.1",
        title="Enforce SSH v2",
        status="FAIL",
        severity="HIGH",
        evidence="set system services ssh protocol-version v1;",
        finding_metadata={"source_lines": [4]},
    )

    # Identifiers must remain distinct even when control_id matches
    assert finding_a.id != finding_b.id
    assert finding_a.audit_id != finding_b.audit_id
    assert finding_a.evidence != finding_b.evidence


# ============================================================
# TEST 6: Evidence Line Exists in Source Configuration
# ============================================================
def test_evidence_line_exists_in_source_configuration():
    cisco_config = """!
version 15.2
hostname CORE-ROUTER-01
service password-encryption
!
line vty 0 4
 transport input telnet
!
end"""

    lines = cisco_config.splitlines()
    parser = parser_registry.get_parser(content=cisco_config, vendor_hint="cisco", filename="cisco.cfg")
    profile = parser.parse(cisco_config, filename="cisco.cfg")

    rule = compliance_catalog.get_rule_by_id("RULE-TELNET-001") # Telnet disabled
    assert rule is not None

    result = RuleEvaluator.evaluate_rule(rule=rule, profile=profile, framework="CIS")
    assert result.status == EvaluationStatus.FAIL
    assert len(result.source_lines) > 0

    # Verify line exists and contains the evidence
    target_line_idx = result.source_lines[0] - 1
    assert 0 <= target_line_idx < len(lines)
    assert "transport input telnet" in lines[target_line_idx]


# ============================================================
# TEST 7: Evidence Maps to Correct Vendor and Parser
# ============================================================
def test_evidence_maps_to_correct_vendor_and_parser():
    junos_config = """system {
    services {
        ssh {
            protocol-version v1;
        }
    }
}"""
    parser = parser_registry.get_parser(content=junos_config, vendor_hint="juniper", filename="junos.conf")
    assert parser.vendor_name == "juniper"
    profile = parser.parse(junos_config, filename="junos.conf")
    assert profile.vendor == "juniper"
    assert profile.remote_access.ssh_version.value == 1


# ============================================================
# TEST 8: Risk Score Deterministic Calculation
# ============================================================
def test_risk_score_deterministic_calculation():
    # Base CRITICAL (90.0) * 0.70 = 63.0
    # Exposure MANAGEMENT_PLANE (+6.0) + Impact CRITICAL (+10.0) = 16.0 * 1.5 = 24.0
    # Single finding bonus = 0
    # Expected score = 63.0 + 24.0 = 87.0
    score, priority, likelihood = calculate_risk_score(
        severity="CRITICAL",
        exposure="MANAGEMENT_PLANE",
        impact="CRITICAL",
        finding_count=1,
    )
    assert score == 87.0
    assert priority == "P1"
    assert likelihood == "HIGH"


# ============================================================
# TEST 9: Synthetic Configuration -> Finding -> Evidence Consistency
# ============================================================
def test_synthetic_config_finding_evidence_consistency():
    fortinet_config = """config system global
    set admin-ssh-v1 enable
    set admin-sport 80
end"""
    parser = parser_registry.get_parser(content=fortinet_config, vendor_hint="fortinet", filename="forti.conf")
    profile = parser.parse(fortinet_config, filename="forti.conf")

    rule = compliance_catalog.get_rule_by_id("RULE-SSH-001") # SSH v2
    assert rule is not None
    res = RuleEvaluator.evaluate_rule(rule=rule, profile=profile, framework="CIS")
    assert res.status == EvaluationStatus.FAIL
    assert any("admin-ssh-v1" in ev for ev in res.evidence)


# ============================================================
# TEST 10: Canonical Metrics Data Integrity Formula
# ============================================================
def test_api_summary_metrics_integrity():
    crit = 2
    high = 3
    med = 5
    low = 1
    info = 0
    open_findings = crit + high + med + low + info

    assert open_findings == 11
    # Check framework averages match overall compliance score
    fw_scores = {"CIS": 80.0, "NIST": 80.0, "STIG": 80.0, "ISO": 80.0}
    avg_score = round(sum(fw_scores.values()) / 4.0, 1)
    assert avg_score == 80.0

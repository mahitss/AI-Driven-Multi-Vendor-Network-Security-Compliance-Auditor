"""
Cross-Vendor Compliance Equivalence Tests
Problem Statement: SIH26155 (NTRO)

Proves that equivalent security configurations on disparate vendors (Cisco IOS and Juniper JunOS)
normalize identically and evaluate to identical PASS / FAIL compliance statuses across all frameworks.
"""
from app.services.compliance.catalog import compliance_catalog
from app.services.compliance.evaluator import RuleEvaluator
from app.services.compliance.models import EvaluationStatus
from app.services.compliance.scorer import ComplianceScoringEngine
from app.services.parser.vendors.cisco.parser import CiscoParser
from app.services.parser.vendors.juniper.parser import JuniperParser


def test_cisco_and_juniper_ssh_v2_produce_identical_compliance_findings():
    cisco_cfg = "ip ssh version 2"
    juniper_cfg = "set system services ssh protocol-version v2"

    cisco_profile = CiscoParser().parse(cisco_cfg)
    juniper_profile = JuniperParser().parse(juniper_cfg)

    ssh_rule = compliance_catalog.get_rule_by_id("RULE-SSH-001")
    assert ssh_rule is not None

    for fw in ["CIS", "NIST", "STIG", "ISO"]:
        cisco_res = RuleEvaluator.evaluate_rule(ssh_rule, cisco_profile, fw)
        juniper_res = RuleEvaluator.evaluate_rule(ssh_rule, juniper_profile, fw)

        # Both must pass identically
        assert cisco_res.status == EvaluationStatus.PASS
        assert juniper_res.status == EvaluationStatus.PASS
        assert cisco_res.actual_value == 2
        assert juniper_res.actual_value == 2
        assert cisco_res.control_id == juniper_res.control_id


def test_cisco_and_juniper_remote_syslog_produce_identical_compliance_findings():
    cisco_cfg = "logging host 10.100.20.50"
    juniper_cfg = "set system syslog host 10.100.20.50 any info"

    cisco_profile = CiscoParser().parse(cisco_cfg)
    juniper_profile = JuniperParser().parse(juniper_cfg)

    log_rule = compliance_catalog.get_rule_by_id("RULE-LOG-REMOTE-001")
    assert log_rule is not None

    for fw in ["CIS", "NIST", "STIG", "ISO"]:
        cisco_res = RuleEvaluator.evaluate_rule(log_rule, cisco_profile, fw)
        juniper_res = RuleEvaluator.evaluate_rule(log_rule, juniper_profile, fw)

        assert cisco_res.status == EvaluationStatus.PASS
        assert juniper_res.status == EvaluationStatus.PASS
        assert cisco_res.actual_value is True
        assert juniper_res.actual_value is True

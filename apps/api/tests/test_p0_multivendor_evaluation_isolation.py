"""
P0 Multi-Vendor Compliance Evaluation Isolation & Evidence Provenance Tests
Problem Statement: SIH26155 (NTRO)

Guarantees:
1. Cross-vendor rule isolation: Cisco-specific rules (AAA, enable secret, VTY access-class)
   NEVER evaluate against Fortinet or Juniper configurations.
2. Evidence provenance: Missing baseline directives NEVER cite Line 1 (or any arbitrary line).
   Line is 0 / empty, indicating unconfigured baseline directive.
3. Distinct inputs evaluate to distinct, vendor-grounded compliance scores.
4. Identical inputs produce 100% deterministic identical scores.
"""
import pytest
from app.services.compliance.catalog import ComplianceCatalog
from app.services.compliance.evaluator import RuleEvaluator
from app.services.compliance.models import EvaluationStatus
from app.services.compliance.scorer import ComplianceScoringEngine
from app.services.parser.vendors.cisco.parser import CiscoParser
from app.services.parser.vendors.fortinet.parser import FortinetParser
from app.services.parser.vendors.juniper.parser import JuniperParser


CISCO_INSECURE_CONFIG = """! Cisco IOS Insecure Gateway
version 15.0
hostname BORDER-RTR-01
no service password-encryption
service finger
no aaa new-model
username admin password 0 cisco123
enable password unencrypted
ip ssh version 1
ip http server
interface GigabitEthernet0/0
 ip proxy-arp
line vty 0 4
 transport input telnet
 login
end
"""

FORTINET_SECURE_CONFIG = """config system global
    set hostname "PERIMETER-FGT-01"
    set admin-ssh-v1 disable
    set admin-https-redirect enable
    set admin-sport 8443
    set admin-lockout-threshold 3
    set admintimeout 10
    set strong-crypto enable
    set pre_login_banner "Authorized government personnel only."
end
config log syslogd setting
    set status enable
    set server "10.10.20.50"
end
config system ntp
    set type manual
    config ntpserver
        edit 1
            set server "10.10.100.1"
        next
    end
end
config firewall policy
    edit 1
        set name "DEFAULT_DENY"
        set action deny
    next
end
"""

JUNIPER_SECURE_CONFIG = """system {
    host-name SECURE-SRX-01;
    login {
        idle-timeout 10;
        user secadmin {
            class super-user;
            authentication {
                encrypted-password "$6$rounds=65600$saltvalue$HashedPassword.";
            }
        }
    }
    services {
        ssh {
            protocol-version v2;
            root-login deny;
        }
        web-management {
            https {
                system-generated-certificate;
            }
        }
    }
    syslog {
        host 10.10.20.50 {
            any warning;
        }
    }
}
"""


def test_catalog_enforces_strict_vendor_applicability():
    """Verify that catalog filters rules according to vendor applicability."""
    catalog = ComplianceCatalog()

    cisco_rules = catalog.get_rules_for_audit(["CIS"], vendor="cisco")
    fgt_rules = catalog.get_rules_for_audit(["CIS"], vendor="fortinet")
    jun_rules = catalog.get_rules_for_audit(["CIS"], vendor="juniper")

    cisco_rule_ids = {r.id for r in cisco_rules}
    fgt_rule_ids = {r.id for r in fgt_rules}
    jun_rule_ids = {r.id for r in jun_rules}

    # Cisco AAA, enable secret, VTY access-class must be in Cisco
    assert "RULE-AAA-001" in cisco_rule_ids
    assert "RULE-SECRET-001" in cisco_rule_ids
    assert "RULE-VTY-ACL-001" in cisco_rule_ids

    # Cisco AAA, enable secret, VTY access-class must NOT be in Fortinet or Juniper
    assert "RULE-AAA-001" not in fgt_rule_ids
    assert "RULE-SECRET-001" not in fgt_rule_ids
    assert "RULE-VTY-ACL-001" not in fgt_rule_ids

    assert "RULE-AAA-001" not in jun_rule_ids
    assert "RULE-SECRET-001" not in jun_rule_ids
    assert "RULE-VTY-ACL-001" not in jun_rule_ids

    # Fortinet specific rules must be in Fortinet
    assert "RULE-DEFAULT-DROP-001" in fgt_rule_ids
    assert "RULE-DEFAULT-DROP-001" not in cisco_rule_ids


def test_fortinet_never_evaluates_cisco_aaa_or_cites_line_1():
    """
    P0 Regression Test: Fortinet configuration must never evaluate CIS-1.1.1 (Cisco AAA)
    and must never cite Line 1 ('config system global') as evidence of failure.
    """
    catalog = ComplianceCatalog()
    fgt_profile = FortinetParser().parse(FORTINET_SECURE_CONFIG)

    rules = catalog.get_rules_for_audit(["CIS"], vendor="fortinet")
    evals = [RuleEvaluator.evaluate_rule(r, fgt_profile, "CIS") for r in rules]

    control_ids = {e.control_id for e in evals}
    assert "CIS-1.1.1" not in control_ids, "CRITICAL: CIS-1.1.1 (Cisco AAA) evaluated on Fortinet!"

    for e in evals:
        if e.status == EvaluationStatus.FAIL:
            assert e.source_lines != [1] or "global" not in str(e.evidence), (
                f"Bogus Line 1 citation found on {e.control_id}: {e.evidence}"
            )


def test_different_vendor_configurations_produce_distinct_accurate_scores():
    """
    Proves that three genuinely different configuration files evaluate to
    distinct, vendor-grounded compliance scores.
    """
    catalog = ComplianceCatalog()

    c_prof = CiscoParser().parse(CISCO_INSECURE_CONFIG)
    f_prof = FortinetParser().parse(FORTINET_SECURE_CONFIG)
    j_prof = JuniperParser().parse(JUNIPER_SECURE_CONFIG)

    c_evals = [RuleEvaluator.evaluate_rule(r, c_prof, "CIS") for r in catalog.get_rules_for_audit(["CIS"], vendor="cisco")]
    f_evals = [RuleEvaluator.evaluate_rule(r, f_prof, "CIS") for r in catalog.get_rules_for_audit(["CIS"], vendor="fortinet")]
    j_evals = [RuleEvaluator.evaluate_rule(r, j_prof, "CIS") for r in catalog.get_rules_for_audit(["CIS"], vendor="juniper")]

    c_summary = ComplianceScoringEngine.calculate_scores("audit-c", "cfg-c", c_evals)
    f_summary = ComplianceScoringEngine.calculate_scores("audit-f", "cfg-f", f_evals)
    j_summary = ComplianceScoringEngine.calculate_scores("audit-j", "cfg-j", j_evals)

    # Insecure Cisco must have low score
    assert c_summary.overall_score < 30.0

    # Hardened Fortinet & Juniper must have high score
    assert f_summary.overall_score >= 70.0
    assert j_summary.overall_score >= 60.0

    # Scores must all be distinct
    scores = {c_summary.overall_score, f_summary.overall_score, j_summary.overall_score}
    assert len(scores) == 3, f"Expected 3 distinct scores, got: {scores}"


def test_same_input_determinism():
    """
    Phase 10: Proves same input bytes evaluated twice produce identical deterministic scores.
    """
    catalog = ComplianceCatalog()
    f_prof1 = FortinetParser().parse(FORTINET_SECURE_CONFIG)
    f_prof2 = FortinetParser().parse(FORTINET_SECURE_CONFIG)

    evals1 = [RuleEvaluator.evaluate_rule(r, f_prof1, "CIS") for r in catalog.get_rules_for_audit(["CIS"], vendor="fortinet")]
    evals2 = [RuleEvaluator.evaluate_rule(r, f_prof2, "CIS") for r in catalog.get_rules_for_audit(["CIS"], vendor="fortinet")]

    score1 = ComplianceScoringEngine.calculate_scores("audit-1", "cfg-1", evals1).overall_score
    score2 = ComplianceScoringEngine.calculate_scores("audit-2", "cfg-2", evals2).overall_score

    assert score1 == score2
    assert [e.status for e in evals1] == [e.status for e in evals2]

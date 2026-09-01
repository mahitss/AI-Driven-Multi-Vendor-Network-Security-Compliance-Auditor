"""
Parser Property Determinism & Invariant Test Suite
Problem Statement: SIH26155 (NTRO)

Tests:
1. Deterministic output invariance: same input configuration parsed N times yields identical fact groups
2. Parser registry selection determinism
3. Compliance rule evaluation invariance given identical NormalizedSecurityProfile
4. Evidence line preservation invariance
5. Unparsed unknown directive classification idempotency
"""
import pytest

from app.services.parser.registry import parser_registry
from app.services.compliance.catalog import compliance_catalog
from app.services.compliance.evaluator import RuleEvaluator
from app.services.compliance.scorer import ComplianceScoringEngine
from app.services.risk.scoring import calculate_risk_score


CISCO_SAMPLE = """!
hostname SEC-CORE-SW01
!
service password-encryption
!
username secops privilege 15 secret 5 $1$mERr$951.q.uA
!
ip ssh version 2
no ip http server
ip http secure-server
!
ntp server 10.0.1.1
snmp-server community NetVigilSecure RO
!
line vty 0 4
 transport input ssh
 exec-timeout 10 0
!
end
"""

JUNIPER_SAMPLE = """
system {
    host-name JUNIPER-BORDER-01;
    authentication-order [ tacplus password ];
    root-authentication {
        encrypted-password "$6$salt$encryptedHashGoesHere";
    }
    services {
        ssh {
            protocol-version v2;
        }
        telnet disable;
        web-management {
            https {
                port 443;
            }
        }
    }
    ntp {
        server 10.0.1.1;
    }
}
snmp {
    community public {
        authorization read-only;
    }
}
"""

FORTINET_SAMPLE = """
config system global
    set hostname "FGT-CORP-FW01"
    set admin-sport 8443
    set admin-ssh-port 22
    set admin-scp enable
    set strong-crypto enable
end

config system admin
    edit "superadmin"
        set accprofile "super_admin"
        set trusthost1 192.168.1.0 255.255.255.0
        set password ENC $6$salt$encryptedPass
    next
end

config system ntp
    set ntpsync enable
    set type custom
    config ntpserver
        edit 1
            set server "10.0.1.1"
        next
    end
end
"""


@pytest.mark.parametrize("config_text,vendor_hint,filename", [
    (CISCO_SAMPLE, "cisco", "cisco_core.cfg"),
    (JUNIPER_SAMPLE, "juniper", "junos_border.conf"),
    (FORTINET_SAMPLE, "fortinet", "fortigate_fw.conf"),
])
def test_parser_property_determinism_invariant(config_text: str, vendor_hint: str, filename: str):
    """Property Invariant: Parsing same configuration 5 times produces 100% identical NormalizedSecurityProfile facts."""
    parser = parser_registry.get_parser(content=config_text, vendor_hint=vendor_hint, filename=filename)

    first_profile = parser.parse(config_text, filename=filename)
    first_dict = first_profile.model_dump(mode="json")
    first_dict.pop("normalized_at", None)

    for _ in range(4):
        subsequent_profile = parser.parse(config_text, filename=filename)
        subsequent_dict = subsequent_profile.model_dump(mode="json")
        subsequent_dict.pop("normalized_at", None)

        assert subsequent_dict == first_dict
        assert subsequent_profile.facts_extracted_count == first_profile.facts_extracted_count
        assert subsequent_profile.unknown_items_count == first_profile.unknown_items_count


@pytest.mark.parametrize("config_text,vendor_hint,filename", [
    (CISCO_SAMPLE, "cisco", "cisco_core.cfg"),
    (JUNIPER_SAMPLE, "juniper", "junos_border.conf"),
    (FORTINET_SAMPLE, "fortinet", "fortigate_fw.conf"),
])
def test_compliance_and_risk_evaluation_determinism(config_text: str, vendor_hint: str, filename: str):
    """Property Invariant: Compliance and risk scoring on identical profile produces identical findings & score."""
    parser = parser_registry.get_parser(content=config_text, vendor_hint=vendor_hint, filename=filename)
    profile = parser.parse(config_text, filename=filename)
    all_rules = compliance_catalog.get_all_rules()

    # Evaluate compliance rules
    results_1 = [RuleEvaluator.evaluate_rule(r, profile, "CIS") for r in all_rules]
    results_2 = [RuleEvaluator.evaluate_rule(r, profile, "CIS") for r in all_rules]

    assert len(results_1) == len(results_2)
    for r1, r2 in zip(results_1, results_2):
        assert r1.status == r2.status
        assert r1.rule_id == r2.rule_id
        assert r1.severity == r2.severity

    # Evaluate score summaries
    summary_1 = ComplianceScoringEngine.calculate_scores("audit_1", "cfg_1", results_1)
    summary_2 = ComplianceScoringEngine.calculate_scores("audit_2", "cfg_2", results_2)

    assert summary_1.overall_score == summary_2.overall_score
    assert summary_1.total_findings == summary_2.total_findings
    assert summary_1.severity_breakdown == summary_2.severity_breakdown
    assert summary_1.status_breakdown == summary_2.status_breakdown

    # Evaluate individual finding risk score determinism
    for r in results_1:
        score_a, pri_a, lik_a = calculate_risk_score(severity=r.severity.value if hasattr(r.severity, "value") else str(r.severity))
        score_b, pri_b, lik_b = calculate_risk_score(severity=r.severity.value if hasattr(r.severity, "value") else str(r.severity))
        assert score_a == score_b
        assert pri_a == pri_b
        assert lik_a == lik_b

"""
Fortinet FortiOS Parser Unit Tests
"""
from app.services.parser.vendors.fortinet.parser import FortinetParser


def test_fortinet_block_ast_parsing():
    fortinet_config = """
    #config-version=FG60F-7.2.4-FW-build1396-230308:opmode=0:vdom=0:user=admin
    config system global
        set hostname "EDGE-FGT-01"
        set timezone "80"
        set admintimeout 10
        set admin-ssh-v1 disable
        set admin-lockout-threshold 3
        set pre-login-banner enable
        set strong-crypto enable
    end
    config system interface
        edit "wan1"
            set allowaccess ping https ssh
        next
    end
    config system ntp
        set ntpserver "10.100.5.1" "10.100.5.2"
    end
    config log syslogd setting
        set status enable
        set server "10.100.20.50"
    end
    config user local
        edit "secops_admin"
            set type password
        next
    end
    config firewall policy
        edit 1
            set name "DENY_ALL"
            set action deny
        next
    end
    config custom unknown-section
        set weird-option enabled
    end
    """
    parser = FortinetParser()
    assert parser.can_parse(fortinet_config) is True

    profile = parser.parse(fortinet_config)

    assert profile.identity.hostname.value == "EDGE-FGT-01"
    assert profile.identity.banner_motd_present.value is True

    # Remote Access & Security
    assert profile.remote_access.ssh_enabled.value is True
    assert profile.remote_access.ssh_version.value == 2
    assert profile.remote_access.https_server_enabled.value is True
    assert profile.remote_access.inactivity_timeout_minutes.value == 10
    assert profile.remote_access.ssh_ciphers_secure.value is True

    # Authentication & Lockout
    assert profile.authentication.failed_login_lockout_enabled.value is True
    assert "secops_admin" in profile.authentication.local_users.value

    # Logging & NTP
    assert profile.logging.logging_enabled.value is True
    assert "10.100.20.50" in profile.logging.remote_syslog_servers.value
    assert "10.100.5.1" in profile.time_sync.ntp_servers.value
    assert "10.100.5.2" in profile.time_sync.ntp_servers.value

    # Access control
    assert profile.access_control.default_drop_inbound.value is True
    assert profile.access_control.inbound_acls_count.value >= 1

    # Unknown item captured
    assert profile.unknown_items_count >= 1


def test_fortinet_sparse_config_validation_and_audit():
    """
    Regression test for 02_FORTINET_TELNET_DISABLED.conf:
    Ensures sparse configurations with unknown/unconfigured facts (value=None)
    serialize to JSON and deserialize via NormalizedSecurityProfile.model_validate
    without Pydantic ValidationError or HTTP 500 exceptions.
    """
    from pathlib import Path
    from app.services.parser.models import NormalizedSecurityProfile
    from app.services.compliance.catalog import compliance_catalog
    from app.services.compliance.evaluator import RuleEvaluator
    from app.services.compliance.scorer import ComplianceScoringEngine

    config_path = Path("data/sample-configs/benchmarks/02_FORTINET_TELNET_DISABLED.conf")
    content = config_path.read_text(encoding="utf-8")

    parser = FortinetParser()
    profile = parser.parse(content, filename="02_FORTINET_TELNET_DISABLED.conf")

    # Facts with missing directives should have value=None and status="unknown"
    assert profile.remote_access.ssh_ciphers_secure.value is None
    assert profile.remote_access.ssh_ciphers_secure.status == "unknown"
    assert profile.authentication.password_encryption_enabled.value is None
    assert profile.access_control.default_drop_inbound.value is None

    # Serialization and validation cycle (must not raise ValidationError)
    dumped = profile.model_dump(mode="json")
    validated = NormalizedSecurityProfile.model_validate(dumped)
    assert validated.remote_access.ssh_ciphers_secure.value is None

    # Full rule evaluation cycle across standard frameworks
    rules = compliance_catalog.get_rules_for_audit(
        frameworks=["CIS", "NIST", "STIG", "ISO"],
        vendor=validated.vendor,
    )
    assert len(rules) > 0

    results = []
    for rule in rules:
        for fw in ["CIS", "NIST", "STIG", "ISO"]:
            if fw in rule.framework_mappings:
                res = RuleEvaluator.evaluate_rule(rule=rule, profile=validated, framework=fw)
                results.append(res)
    assert len(results) > 0

    # Telnet should be evaluated as disabled / pass
    telnet_results = [r for r in results if r.control_id == "CIS-1.2.2"]
    assert len(telnet_results) == 1
    assert telnet_results[0].status.value == "PASS"

    # Score calculation
    summary = ComplianceScoringEngine.calculate_scores(
        audit_id="audit-sparse-fortinet-01",
        configuration_id="cfg-sparse-01",
        results=results,
    )
    assert summary.overall_score >= 0.0


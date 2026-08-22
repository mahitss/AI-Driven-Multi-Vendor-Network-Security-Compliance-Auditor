"""
Cisco IOS / IOS-XE Parser Unit Tests
"""
from app.services.parser.vendors.cisco.parser import CiscoParser


def test_cisco_parser_extracts_all_security_facts_with_evidence():
    config_text = """
    !
    version 17.3
    hostname CORE-RTR-01
    ip domain name corp.netvigil.internal
    service password-encryption
    no service finger
    no ip http server
    ip http secure-server
    ip ssh version 2
    ip ssh time-out 60
    enable secret 9 $9$J8f0d83jLk92.kE109k$O8L1iKj.1mQ09s8v7x6
    username netsec_admin privilege 15 secret 9 $9$dummy
    aaa new-model
    aaa authorization commands 15 default group tacacs+ local
    logging buffered 65536 informational
    logging host 10.100.20.50
    ntp server 10.100.5.1
    ntp authenticate
    spanning-tree portfast bpduguard default
    line vty 0 4
     transport input ssh
     access-class 10 in
     exec-timeout 10 0
    end
    """
    parser = CiscoParser()
    assert parser.can_parse(config_text) is True

    profile = parser.parse(config_text)

    # 1. Identity
    assert profile.identity.hostname.value == "CORE-RTR-01"
    assert "hostname CORE-RTR-01" in profile.identity.hostname.evidence[0]
    assert profile.identity.hostname.source_lines[0] > 0
    assert profile.identity.domain_name.value == "corp.netvigil.internal"

    # 2. Remote Access
    assert profile.remote_access.ssh_enabled.value is True
    assert profile.remote_access.ssh_version.value == 2
    assert "ip ssh version 2" in profile.remote_access.ssh_version.evidence[0]
    assert profile.remote_access.telnet_enabled.value is False
    assert profile.remote_access.http_server_enabled.value is False
    assert profile.remote_access.https_server_enabled.value is True
    assert profile.remote_access.vty_access_class_applied.value is True
    assert profile.remote_access.inactivity_timeout_minutes.value == 10

    # 3. Authentication
    assert profile.authentication.aaa_enabled.value is True
    assert profile.authentication.password_encryption_enabled.value is True
    assert profile.authentication.enable_secret_configured.value is True
    assert profile.authentication.enable_secret_type.value == "scrypt_type9"
    assert profile.authentication.local_users_count.value == 1
    assert "netsec_admin" in profile.authentication.local_users.value

    # 4. Logging & NTP
    assert profile.logging.logging_enabled.value is True
    assert profile.logging.remote_logging_enabled.value is True
    assert "10.100.20.50" in profile.logging.remote_syslog_servers.value
    assert profile.time_sync.ntp_enabled.value is True
    assert "10.100.5.1" in profile.time_sync.ntp_servers.value
    assert profile.time_sync.ntp_authentication_enabled.value is True

    # 5. Network Security
    assert profile.network_security.spanning_tree_bpdu_guard_enabled.value is True
    assert profile.facts_extracted_count >= 15


def test_cisco_parser_captures_unknown_syntax():
    config_text = """
    hostname RTR-UNKNOWN-01
    unknown-proprietary-command arg1 arg2
    custom-vendor-telemetry-directive enable
    """
    parser = CiscoParser()
    profile = parser.parse(config_text)

    assert profile.identity.hostname.value == "RTR-UNKNOWN-01"
    assert profile.unknown_items_count >= 2
    unknown_texts = [u.raw_text for u in profile.unknown_items]
    assert any("unknown-proprietary-command" in t for t in unknown_texts)
    assert any("custom-vendor-telemetry-directive" in t for t in unknown_texts)

"""
Cross-Vendor Normalization Equivalence Tests
Problem Statement: SIH26155 (NTRO)

Verifies that disparate syntax across Cisco, Juniper, and Fortinet
normalizes into identical semantic representations in the Universal Security Model.
"""
from app.services.parser.vendors.cisco.parser import CiscoParser
from app.services.parser.vendors.fortinet.parser import FortinetParser
from app.services.parser.vendors.juniper.parser import JuniperParser


def test_cross_vendor_ssh_version_2_normalization_equivalence():
    cisco_syntax = "ip ssh version 2"
    juniper_syntax = "set system services ssh protocol-version v2"
    fortinet_syntax = "config system global\n set admin-ssh-v1 disable\nend"

    cisco_profile = CiscoParser().parse(cisco_syntax)
    juniper_profile = JuniperParser().parse(juniper_syntax)
    fortinet_profile = FortinetParser().parse(fortinet_syntax)

    # All three must produce identical normalized semantics
    assert cisco_profile.remote_access.ssh_version.value == 2
    assert juniper_profile.remote_access.ssh_version.value == 2
    assert fortinet_profile.remote_access.ssh_version.value == 2

    assert cisco_profile.remote_access.ssh_enabled.value is True
    assert juniper_profile.remote_access.ssh_enabled.value is True
    assert fortinet_profile.remote_access.ssh_enabled.value is True


def test_cross_vendor_remote_syslog_normalization_equivalence():
    cisco_syntax = "logging host 10.100.20.50"
    juniper_syntax = "set system syslog host 10.100.20.50 any info"
    fortinet_syntax = "config log syslogd setting\n set server 10.100.20.50\nend"

    cisco_profile = CiscoParser().parse(cisco_syntax)
    juniper_profile = JuniperParser().parse(juniper_syntax)
    fortinet_profile = FortinetParser().parse(fortinet_syntax)

    assert cisco_profile.logging.remote_logging_enabled.value is True
    assert juniper_profile.logging.remote_logging_enabled.value is True
    assert fortinet_profile.logging.remote_logging_enabled.value is True

    assert "10.100.20.50" in cisco_profile.logging.remote_syslog_servers.value
    assert "10.100.20.50" in juniper_profile.logging.remote_syslog_servers.value
    assert "10.100.20.50" in fortinet_profile.logging.remote_syslog_servers.value


def test_cross_vendor_ntp_server_normalization_equivalence():
    cisco_syntax = "ntp server 10.100.5.1"
    juniper_syntax = "set system ntp server 10.100.5.1"
    fortinet_syntax = "config system ntp\n set ntpserver \"10.100.5.1\"\nend"

    cisco_profile = CiscoParser().parse(cisco_syntax)
    juniper_profile = JuniperParser().parse(juniper_syntax)
    fortinet_profile = FortinetParser().parse(fortinet_syntax)

    assert cisco_profile.time_sync.ntp_enabled.value is True
    assert juniper_profile.time_sync.ntp_enabled.value is True
    assert fortinet_profile.time_sync.ntp_enabled.value is True

    assert "10.100.5.1" in cisco_profile.time_sync.ntp_servers.value
    assert "10.100.5.1" in juniper_profile.time_sync.ntp_servers.value
    assert "10.100.5.1" in fortinet_profile.time_sync.ntp_servers.value

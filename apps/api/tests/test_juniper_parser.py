"""
Juniper JunOS Parser Unit Tests (Hierarchical & Set Syntax)
"""
from app.services.parser.vendors.juniper.parser import JuniperParser


def test_juniper_hierarchical_syntax_parsing():
    config_text = """
    version 21.4R3-S2;
    system {
        host-name FW-PERIMETER-01;
        domain-name netvigil.internal;
        root-authentication {
            encrypted-password "$6$kO9d8s7g$dummy";
        }
        services {
            ssh {
                protocol-version v2;
                ciphers [ aes256-gcm@openssh.com aes128-gcm@openssh.com ];
            }
        }
        login {
            message "AUTHORIZED GOV / NTRO ACCESS ONLY. Unauthorized access is strictly prohibited.";
            user secops {
                class super-user;
            }
        }
        syslog {
            host 10.100.20.50 {
                any notice;
            }
        }
        ntp {
            server 10.100.5.1;
        }
    }
    security {
        policies {
            default-policy {
                deny-all;
            }
        }
    }
    """
    parser = JuniperParser()
    assert parser.can_parse(config_text) is True

    profile = parser.parse(config_text)

    # Facts
    assert profile.identity.hostname.value == "FW-PERIMETER-01"
    assert profile.identity.banner_motd_present.value is True
    assert profile.identity.banner_legal_warning.value is True

    # Remote Access
    assert profile.remote_access.ssh_enabled.value is True
    assert profile.remote_access.ssh_version.value == 2
    assert profile.remote_access.ssh_ciphers_secure.value is True

    # Authentication & Logging
    assert profile.authentication.enable_secret_configured.value is True
    assert profile.authentication.enable_secret_type.value == "sha512_type6"
    assert "secops" in profile.authentication.local_users.value
    assert profile.logging.remote_logging_enabled.value is True
    assert "10.100.20.50" in profile.logging.remote_syslog_servers.value

    # Time Sync & Access Control
    assert "10.100.5.1" in profile.time_sync.ntp_servers.value
    assert profile.access_control.default_drop_inbound.value is True


def test_juniper_set_syntax_parsing():
    set_config = """
    set version 20.2R1.10
    set system host-name SRX-BRANCH-01
    set system services ssh protocol-version v2
    delete system services telnet
    set system syslog host 10.100.20.50 any info
    set system ntp server 10.100.5.1
    set security policies default-policy deny-all
    set unknown-proprietary-directive value-123
    """
    parser = JuniperParser()
    profile = parser.parse(set_config)

    assert profile.identity.hostname.value == "SRX-BRANCH-01"
    assert profile.remote_access.ssh_enabled.value is True
    assert profile.remote_access.ssh_version.value == 2
    assert profile.remote_access.telnet_enabled.value is False
    assert "10.100.20.50" in profile.logging.remote_syslog_servers.value
    assert "10.100.5.1" in profile.time_sync.ntp_servers.value
    assert profile.access_control.default_drop_inbound.value is True
    assert profile.unknown_items_count >= 1

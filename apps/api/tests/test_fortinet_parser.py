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

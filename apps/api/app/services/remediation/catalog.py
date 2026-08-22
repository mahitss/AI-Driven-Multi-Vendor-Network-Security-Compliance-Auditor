"""
Authoritative Vendor Remediation Catalog
Problem Statement: SIH26155 (NTRO)

Strictly allowlisted static templates for Cisco IOS, Juniper JunOS, and Fortinet FortiOS.
NO dynamic execution or arbitrary shell commands.
"""
from typing import Any, Dict, List, Optional

REMEDIATION_CATALOG: List[Dict[str, Any]] = [
    # -------------------------------------------------------------
    # CISCO IOS / IOS-XE TEMPLATES
    # -------------------------------------------------------------
    {
        "template_id": "CISCO-SSH-001",
        "vendor": "cisco",
        "normalized_control": "remote_access.ssh_version",
        "title": "Enforce SSH Version 2 with Cryptographic Key Generation",
        "commands": """configure terminal
ip ssh version 2
crypto key generate rsa modulus 2048
end
write memory""",
        "rollback_commands": """configure terminal
no ip ssh version 2
end""",
        "why_recommended": "SSH Version 1 contains severe cryptographic vulnerabilities allowing man-in-the-middle decryption and session hijacking.",
        "potential_impact": "Legacy management clients lacking SSHv2 support will be unable to establish remote management sessions.",
        "verification_steps": "show ip ssh\n# Verify SSH protocol version is reported as 2.0",
        "confidence": 1.0,
    },
    {
        "template_id": "CISCO-TELNET-001",
        "vendor": "cisco",
        "normalized_control": "remote_access.telnet_enabled",
        "title": "Disable Cleartext Telnet on Virtual Terminal Lines",
        "commands": """configure terminal
line vty 0 4
 transport input ssh
line vty 5 15
 transport input ssh
end
write memory""",
        "rollback_commands": """configure terminal
line vty 0 15
 transport input all
end""",
        "why_recommended": "Telnet transmits administrative credentials and configuration data in cleartext across the network without encryption.",
        "potential_impact": "Unencrypted Telnet management sessions will be immediately terminated and blocked on lines 0-15.",
        "verification_steps": "show running-config | section line vty\n# Ensure 'transport input ssh' is configured on all VTY lines.",
        "confidence": 1.0,
    },
    {
        "template_id": "CISCO-PASS-001",
        "vendor": "cisco",
        "normalized_control": "authentication.password_encryption_enabled",
        "title": "Enable Global Password Encryption Service",
        "commands": """configure terminal
service password-encryption
end
write memory""",
        "rollback_commands": """configure terminal
no service password-encryption
end""",
        "why_recommended": "Prevents accidental shoulder-surfing exposure of cleartext passwords in terminal displays and configuration backups.",
        "potential_impact": "All existing and new cleartext passwords in the running configuration will be obscured with Type 7 encoding.",
        "verification_steps": "show running-config | include password-encryption\n# Verify 'service password-encryption' is present.",
        "confidence": 1.0,
    },
    {
        "template_id": "CISCO-AAA-001",
        "vendor": "cisco",
        "normalized_control": "authentication.aaa_enabled",
        "title": "Enable AAA Centralized Authentication Subsystem",
        "commands": """configure terminal
aaa new-model
aaa authentication login default local
end
write memory""",
        "rollback_commands": """configure terminal
no aaa new-model
end""",
        "why_recommended": "AAA provides centralized authentication, granular authorization, and non-repudiation audit logging for administrative logins.",
        "potential_impact": "Changes device login flow. Local administrative users must be configured before applying to prevent management lockout.",
        "verification_steps": "show aaa status\n# Verify AAA subsystem is active and local login method list is applied.",
        "confidence": 1.0,
    },
    {
        "template_id": "CISCO-HTTP-001",
        "vendor": "cisco",
        "normalized_control": "remote_access.http_server_enabled",
        "title": "Disable Insecure HTTP Management Server",
        "commands": """configure terminal
no ip http server
ip http secure-server
end
write memory""",
        "rollback_commands": """configure terminal
ip http server
end""",
        "why_recommended": "Unencrypted HTTP web management transmits administrative session cookies and device credentials in cleartext.",
        "potential_impact": "HTTP port 80 web management will be closed; administrators must use HTTPS port 443.",
        "verification_steps": "show ip http server status\n# Confirm HTTP server is disabled and secure HTTPS server is active.",
        "confidence": 1.0,
    },
    {
        "template_id": "CISCO-LOG-001",
        "vendor": "cisco",
        "normalized_control": "logging.remote_logging_enabled",
        "title": "Configure Centralized Remote Syslog Forwarding",
        "commands": """configure terminal
logging on
logging host 10.10.100.50
logging trap informational
service timestamps log datetime msec show-timezone
end
write memory""",
        "rollback_commands": """configure terminal
no logging host 10.10.100.50
end""",
        "why_recommended": "Remote syslog ensures security events are forwarded to the centralized SIEM for real-time monitoring and forensic preservation.",
        "potential_impact": "Sends UDP/TCP syslog packets to the configured SIEM IP collector.",
        "verification_steps": "show logging\n# Confirm logging host is active and packet transmission counters increment.",
        "confidence": 1.0,
    },
    {
        "template_id": "CISCO-NTP-001",
        "vendor": "cisco",
        "normalized_control": "time_sync.ntp_enabled",
        "title": "Configure Authoritative NTP Time Synchronization",
        "commands": """configure terminal
ntp server 10.10.100.1 prefer
ntp authenticate
end
write memory""",
        "rollback_commands": """configure terminal
no ntp server 10.10.100.1
end""",
        "why_recommended": "Accurate, synchronized timestamps across all network infrastructure are required for cryptographic validation and forensic event correlation.",
        "potential_impact": "Device clock will synchronize with the authoritative NTP source.",
        "verification_steps": "show ntp associations\n# Verify stratum synchronization status.",
        "confidence": 1.0,
    },
    {
        "template_id": "CISCO-STP-001",
        "vendor": "cisco",
        "normalized_control": "network_security.spanning_tree_bpdu_guard_enabled",
        "title": "Enable Global Spanning Tree PortFast BPDU Guard",
        "commands": """configure terminal
spanning-tree portfast bpduguard default
end
write memory""",
        "rollback_commands": """configure terminal
no spanning-tree portfast bpduguard default
end""",
        "why_recommended": "BPDU Guard prevents rogue switch injection and Layer 2 STP topology hijacking by disabling edge ports receiving unexpected BPDUs.",
        "potential_impact": "Edge access ports connecting rogue switches will be automatically placed in err-disable state.",
        "verification_steps": "show spanning-tree summary\n# Verify 'PortFast BPDU Guard is enabled by default'.",
        "confidence": 1.0,
    },
    {
        "template_id": "CISCO-FINGER-001",
        "vendor": "cisco",
        "normalized_control": "services.finger_disabled",
        "title": "Disable Insecure Legacy Finger Daemon",
        "commands": """configure terminal
no service finger
end
write memory""",
        "rollback_commands": """configure terminal
service finger
end""",
        "why_recommended": "Finger protocol (TCP port 79) leaks active logged-in usernames and system telemetry to unauthenticated network scanners.",
        "potential_impact": "Finger service port 79 will be shut down.",
        "verification_steps": "show running-config | include finger\n# Confirm 'no service finger' is present.",
        "confidence": 1.0,
    },
    {
        "template_id": "CISCO-PROXYARP-001",
        "vendor": "cisco",
        "normalized_control": "services.proxy_arp_disabled",
        "title": "Disable Proxy ARP on Routed Interfaces",
        "commands": """configure terminal
interface GigabitEthernet0/0
 no ip proxy-arp
interface GigabitEthernet0/1
 no ip proxy-arp
end
write memory""",
        "rollback_commands": """configure terminal
interface GigabitEthernet0/0
 ip proxy-arp
end""",
        "why_recommended": "Proxy ARP causes routers to respond to ARP requests on behalf of other hosts, enabling ARP spoofing and asymmetric routing anomalies.",
        "potential_impact": "Hosts misconfigured without a default gateway may lose routed connectivity.",
        "verification_steps": "show ip interface GigabitEthernet0/0 | include Proxy\n# Verify 'Proxy ARP is disabled'.",
        "confidence": 1.0,
    },

    # -------------------------------------------------------------
    # JUNIPER JUNOS TEMPLATES
    # -------------------------------------------------------------
    {
        "template_id": "JUNIPER-SSH-001",
        "vendor": "juniper",
        "normalized_control": "remote_access.ssh_version",
        "title": "Enforce SSH Protocol Version 2",
        "commands": """set system services ssh protocol-version v2
commit comment "NetVigil: Enforce SSH v2 compliance" """,
        "rollback_commands": """delete system services ssh protocol-version
commit comment "Rollback SSH version restriction" """,
        "why_recommended": "Enforces modern SSHv2 cryptographic ciphers and key exchanges on Junos management plane.",
        "potential_impact": "Legacy SSHv1 clients will be denied connection.",
        "verification_steps": "show configuration system services ssh\n# Verify protocol-version v2 is active.",
        "confidence": 1.0,
    },
    {
        "template_id": "JUNIPER-TELNET-001",
        "vendor": "juniper",
        "normalized_control": "remote_access.telnet_enabled",
        "title": "Delete Insecure Telnet Management Service",
        "commands": """delete system services telnet
commit comment "NetVigil: Remove unencrypted Telnet" """,
        "rollback_commands": """set system services telnet
commit comment "Rollback Telnet enable" """,
        "why_recommended": "Telnet communicates in cleartext without encryption, risking credential theft.",
        "potential_impact": "Port 23 Telnet daemon on Junos is stopped immediately upon commit.",
        "verification_steps": "show configuration system services\n# Verify 'telnet' is completely absent from services hierarchy.",
        "confidence": 1.0,
    },
    {
        "template_id": "JUNIPER-HTTP-001",
        "vendor": "juniper",
        "normalized_control": "remote_access.http_server_enabled",
        "title": "Disable Cleartext Web Management HTTP Service",
        "commands": """delete system services web-management http
set system services web-management https
commit comment "NetVigil: Enforce HTTPS web management" """,
        "rollback_commands": """set system services web-management http
commit comment "Rollback web-management HTTP" """,
        "why_recommended": "Disables unencrypted web administration and requires TLS HTTPS encryption.",
        "potential_impact": "HTTP port 80 web management will be disabled.",
        "verification_steps": "show configuration system services web-management\n# Confirm https is present and http is deleted.",
        "confidence": 1.0,
    },
    {
        "template_id": "JUNIPER-LOG-001",
        "vendor": "juniper",
        "normalized_control": "logging.remote_logging_enabled",
        "title": "Configure Remote Syslog Forwarding",
        "commands": """set system syslog host 10.10.100.50 any informational
commit comment "NetVigil: Configure centralized syslog host" """,
        "rollback_commands": """delete system syslog host 10.10.100.50
commit comment "Rollback remote syslog" """,
        "why_recommended": "Exports real-time Junos system and security events to the centralized SOC/SIEM.",
        "potential_impact": "Syslog UDP stream begins egressing towards 10.10.100.50.",
        "verification_steps": "show configuration system syslog host 10.10.100.50\n# Verify configuration.",
        "confidence": 1.0,
    },
    {
        "template_id": "JUNIPER-NTP-001",
        "vendor": "juniper",
        "normalized_control": "time_sync.ntp_enabled",
        "title": "Configure Authoritative NTP Server",
        "commands": """set system ntp server 10.10.100.1 prefer
commit comment "NetVigil: Configure primary NTP server" """,
        "rollback_commands": """delete system ntp server 10.10.100.1
commit comment "Rollback NTP server" """,
        "why_recommended": "Ensures authoritative time synchronization for cryptographic audit logs.",
        "potential_impact": "Junos system clock will align to the specified time server.",
        "verification_steps": "show ntp status\n# Check NTP peer status.",
        "confidence": 1.0,
    },

    # -------------------------------------------------------------
    # FORTINET FORTIOS TEMPLATES
    # -------------------------------------------------------------
    {
        "template_id": "FORTINET-SSH-001",
        "vendor": "fortinet",
        "normalized_control": "remote_access.ssh_version",
        "title": "Disable SSH Version 1 Administration",
        "commands": """config system global
    set admin-ssh-v1 disable
end""",
        "rollback_commands": """config system global
    set admin-ssh-v1 enable
end""",
        "why_recommended": "Prevents legacy SSHv1 downgrade attacks against FortiGate admin portal.",
        "potential_impact": "FortiGate rejects any SSHv1 negotiation attempts.",
        "verification_steps": "get system global | grep admin-ssh-v1\n# Verify admin-ssh-v1 is disable.",
        "confidence": 1.0,
    },
    {
        "template_id": "FORTINET-HTTP-001",
        "vendor": "fortinet",
        "normalized_control": "remote_access.http_server_enabled",
        "title": "Enforce HTTPS Only for Web Administration",
        "commands": """config system global
    set admin-sport 443
    set admin-lockout-duration 300
    set admin-lockout-threshold 3
end""",
        "rollback_commands": """config system global
    set admin-sport 80
end""",
        "why_recommended": "Enforces TLS encryption and brute-force lockout for FortiGate management.",
        "potential_impact": "Admin GUI accessible only via HTTPS with brute-force rate limiting.",
        "verification_steps": "get system global | grep admin-sport\n# Verify HTTPS port 443.",
        "confidence": 1.0,
    },
    {
        "template_id": "FORTINET-LOG-001",
        "vendor": "fortinet",
        "normalized_control": "logging.remote_logging_enabled",
        "title": "Configure Remote Syslogd Logging",
        "commands": """config log syslogd setting
    set status enable
    set server 10.10.100.50
    set mode udp
    set port 514
end""",
        "rollback_commands": """config log syslogd setting
    set status disable
end""",
        "why_recommended": "Sends FortiOS security telemetry and traffic audit logs to centralized SIEM.",
        "potential_impact": "Syslog events are transmitted to 10.10.100.50:514.",
        "verification_steps": "get log syslogd setting\n# Verify status is enable.",
        "confidence": 1.0,
    },
    {
        "template_id": "FORTINET-NTP-001",
        "vendor": "fortinet",
        "normalized_control": "time_sync.ntp_enabled",
        "title": "Enable Network Time Protocol Synchronization",
        "commands": """config system ntp
    set ntpsync enable
    set type custom
    config ntpserver
        edit 1
            set server 10.10.100.1
        next
    end
end""",
        "rollback_commands": """config system ntp
    set ntpsync disable
end""",
        "why_recommended": "Synchronizes FortiGate clock with authoritative security time server.",
        "potential_impact": "FortiOS clock synchronizes with custom NTP server.",
        "verification_steps": "diagnose sys ntp status\n# Verify synchronization status.",
        "confidence": 1.0,
    },
]


def find_remediation_template(vendor: str, normalized_control: str) -> Optional[Dict[str, Any]]:
    """
    Looks up allowlisted static remediation template by vendor and normalized control.
    Returns None if vendor or control is not supported.
    """
    v_clean = vendor.lower().strip()
    c_clean = normalized_control.lower().strip().replace(".value", "")

    for item in REMEDIATION_CATALOG:
        target_ctrl = item["normalized_control"].lower().replace(".value", "")
        if item["vendor"] == v_clean and target_ctrl == c_clean:
            return item

    return None

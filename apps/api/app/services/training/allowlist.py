"""
Normalized Property Safety Allowlist
Problem Statement: SIH26155 (NTRO)

Security Guarantee:
- Prevents administrators or AI models from creating training mappings with arbitrary internal object paths
  or path-traversal strings (e.g. '../../database' or '__proto__').
- Ensures that all learned mappings strictly populate recognized fields in the Universal Security Model.
"""
from typing import Any, Dict, List, Set, Tuple


# Allowlisted canonical properties with their expected data types and parent category
NORMALIZED_PROPERTY_ALLOWLIST: Dict[str, Dict[str, Any]] = {
    "identity.hostname": {"type": str, "category": "identity", "description": "Device system hostname"},
    "identity.banner_motd_present": {"type": bool, "category": "identity", "description": "MOTD login banner presence"},
    "identity.banner_legal_warning": {"type": bool, "category": "identity", "description": "Legal advisory in banner"},
    
    "remote_access.ssh_enabled": {"type": bool, "category": "remote_access", "description": "SSH remote management enabled"},
    "remote_access.ssh_version": {"type": int, "category": "remote_access", "description": "SSH protocol version (1 or 2)"},
    "remote_access.ssh_ciphers_secure": {"type": bool, "category": "remote_access", "description": "SSH strong ciphers only"},
    "remote_access.telnet_enabled": {"type": bool, "category": "remote_access", "description": "Telnet cleartext service status"},
    "remote_access.http_server_enabled": {"type": bool, "category": "remote_access", "description": "Unencrypted HTTP management server"},
    "remote_access.https_server_enabled": {"type": bool, "category": "remote_access", "description": "TLS HTTPS management server"},
    "remote_access.vty_access_class_applied": {"type": bool, "category": "remote_access", "description": "Inbound ACL on management VTY lines"},
    "remote_access.inactivity_timeout_minutes": {"type": int, "category": "remote_access", "description": "Session idle timeout in minutes"},
    
    "authentication.aaa_enabled": {"type": bool, "category": "authentication", "description": "AAA new-model subsystem active"},
    "authentication.password_encryption_enabled": {"type": bool, "category": "authentication", "description": "Global password encryption service"},
    "authentication.enable_secret_configured": {"type": bool, "category": "authentication", "description": "Privileged enable secret hash configured"},
    "authentication.failed_login_lockout_enabled": {"type": bool, "category": "authentication", "description": "Brute-force login lockout defense"},
    
    "authorization.role_based_access_enabled": {"type": bool, "category": "authorization", "description": "RBAC user privilege levels enforced"},
    "authorization.command_authorization_enabled": {"type": bool, "category": "authorization", "description": "Command authorization enforcement"},
    "authorization.accounting_commands_enabled": {"type": bool, "category": "authorization", "description": "Command audit accounting enabled"},
    
    "logging.logging_enabled": {"type": bool, "category": "logging", "description": "System event logging enabled"},
    "logging.remote_logging_enabled": {"type": bool, "category": "logging", "description": "Remote Syslog server forwarding"},
    "logging.log_timestamps_enabled": {"type": bool, "category": "logging", "description": "High-precision log timestamps enabled"},
    
    "time_sync.ntp_enabled": {"type": bool, "category": "time_sync", "description": "Authoritative NTP time synchronization"},
    "time_sync.ntp_authentication_enabled": {"type": bool, "category": "time_sync", "description": "NTP cryptographic authentication"},
    
    "access_control.control_plane_policing_enabled": {"type": bool, "category": "access_control", "description": "CoPP control plane rate limiting"},
    "access_control.default_drop_inbound": {"type": bool, "category": "access_control", "description": "Explicit default drop on perimeter interface"},
    
    "services.snmp_enabled": {"type": bool, "category": "services", "description": "SNMP management service active"},
    "services.snmp_default_communities_removed": {"type": bool, "category": "services", "description": "Default public/private community strings removed"},
    "services.finger_disabled": {"type": bool, "category": "services", "description": "Legacy finger daemon disabled"},
    "services.proxy_arp_disabled": {"type": bool, "category": "services", "description": "Proxy ARP disabled on routed interfaces"},
    
    "network_security.spanning_tree_bpdu_guard_enabled": {"type": bool, "category": "network_security", "description": "STP BPDU Guard enabled on access ports"},
    "network_security.dhcp_snooping_enabled": {"type": bool, "category": "network_security", "description": "DHCP Snooping untrusted port defense"},
    "network_security.dynamic_arp_inspection_enabled": {"type": bool, "category": "network_security", "description": "DAI ARP spoofing mitigation"},
    "network_security.port_security_enabled": {"type": bool, "category": "network_security", "description": "MAC address limit / Port Security enabled"},
}


def is_property_allowlisted(property_path: str) -> bool:
    """Checks if a normalized property path is present in the approved safety allowlist."""
    return property_path.strip() in NORMALIZED_PROPERTY_ALLOWLIST


def validate_and_cast_property_value(property_path: str, raw_value: Any) -> Tuple[bool, str, Any]:
    """
    Validates that property_path is allowlisted and converts raw_value to the expected data type.
    Returns (is_valid, error_message, cast_value).
    """
    prop = property_path.strip()
    if prop not in NORMALIZED_PROPERTY_ALLOWLIST:
        return False, f"Property '{prop}' is not in the approved Universal Security Model allowlist.", None

    schema_info = NORMALIZED_PROPERTY_ALLOWLIST[prop]
    expected_type = schema_info["type"]

    try:
        if expected_type is bool:
            if isinstance(raw_value, bool):
                val = raw_value
            elif isinstance(raw_value, str):
                val = raw_value.lower().strip() in ["true", "1", "yes", "enable", "enabled", "on"]
            elif isinstance(raw_value, (int, float)):
                val = bool(raw_value)
            else:
                val = bool(raw_value)
            return True, "", val

        elif expected_type is int:
            val = int(raw_value)
            return True, "", val

        elif expected_type is str:
            val = str(raw_value).strip()
            return True, "", val

        return True, "", raw_value
    except Exception as e:
        return False, f"Failed to cast value '{raw_value}' to expected type {expected_type.__name__}: {e}", None


def get_allowlist_metadata() -> List[Dict[str, Any]]:
    """Returns all allowlisted properties with categories and descriptions."""
    return [
        {
            "property": k,
            "type": v["type"].__name__,
            "category": v["category"],
            "description": v["description"],
        }
        for k, v in sorted(NORMALIZED_PROPERTY_ALLOWLIST.items())
    ]

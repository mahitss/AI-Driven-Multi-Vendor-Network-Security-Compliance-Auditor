"""
NetVigil Universal Security Schema (Canonical Representation)
Problem Statement: SIH26155 (NTRO)

A vendor-neutral, versioned, strongly-typed domain model representing network security posture.
All vendor-specific configurations (Cisco IOS, Juniper JunOS, Fortinet FortiOS) are normalized into this schema.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class SchemaBase(BaseModel):
    class Config:
        frozen = False
        extra = "allow"


class DeviceIdentity(SchemaBase):
    hostname: str = Field(default="unknown-node", description="Device administrative hostname")
    domain_name: Optional[str] = Field(default=None, description="Configured DNS domain name")
    banner_motd_present: bool = Field(default=False, description="Whether an MOTD login banner is configured")
    banner_legal_warning: bool = Field(
        default=False, description="Whether legal warning against unauthorized access is present in the banner"
    )
    os_family: Optional[str] = Field(default=None, description="Operating system family (e.g., IOS, JunOS, FortiOS)")
    os_version: Optional[str] = Field(default=None, description="Normalized firmware/OS version string")
    hardware_model: Optional[str] = Field(default=None, description="Hardware model specification")


class AuthenticationSecurity(SchemaBase):
    aaa_enabled: bool = Field(default=False, description="Whether AAA (Authentication, Authorization, Accounting) is enabled")
    password_encryption_enabled: bool = Field(
        default=False, description="Whether global reversible or weak password storage is replaced with strong hashes"
    )
    enable_secret_type: Optional[str] = Field(
        default=None, description="Algorithm used for privileged enable secret (e.g., scrypt_type9, sha256_type8, md5_type5, plain)"
    )
    password_min_length: Optional[int] = Field(default=None, description="Configured minimum password length policy")
    local_users_count: int = Field(default=0, description="Total count of locally defined user accounts")
    local_users_with_weak_hashes: List[str] = Field(
        default_factory=list, description="List of local usernames using weak hash algorithms (Type 7, Type 0)"
    )
    tacacs_servers: List[str] = Field(default_factory=list, description="Configured TACACS+ server IP/host addresses")
    radius_servers: List[str] = Field(default_factory=list, description="Configured RADIUS server IP/host addresses")
    failed_login_lockout_enabled: bool = Field(
        default=False, description="Whether brute-force login failure rate-limiting or lockout is enabled"
    )


class AuthorizationSecurity(SchemaBase):
    role_based_access_enabled: bool = Field(
        default=False, description="Whether Role-Based Access Control (RBAC) or privilege separation is configured"
    )
    command_authorization_enabled: bool = Field(
        default=False, description="Whether command execution requires AAA authorization check"
    )
    accounting_commands_enabled: bool = Field(
        default=False, description="Whether interactive and privilege command accounting is audited"
    )


class RemoteAccessSecurity(SchemaBase):
    ssh_enabled: bool = Field(default=False, description="Whether SSH remote management is operational")
    ssh_version: int = Field(default=2, description="SSH protocol version enforced (e.g., 2)")
    ssh_timeout_seconds: Optional[int] = Field(default=None, description="Configured SSH idle timeout in seconds")
    ssh_ciphers_secure: bool = Field(default=True, description="Whether legacy/insecure ciphers (DES, 3DES, RC4) are excluded")
    telnet_enabled: bool = Field(default=False, description="Whether unencrypted Telnet service is active")
    http_server_enabled: bool = Field(default=False, description="Whether unencrypted HTTP web management server is running")
    https_server_enabled: bool = Field(default=False, description="Whether secure HTTPS web management server is active")
    https_tls_min_version: Optional[str] = Field(default="1.2", description="Minimum TLS version for web administration")
    vty_access_class_applied: bool = Field(
        default=False, description="Whether management lines (VTY) are restricted by ACL/firewall filter"
    )
    inactivity_timeout_minutes: Optional[int] = Field(
        default=None, description="Global terminal session exec-timeout in minutes"
    )


class AccessControlSecurity(SchemaBase):
    inbound_firewall_filter_present: bool = Field(
        default=False, description="Whether inbound packet filtering / ACLs are applied to public/management interfaces"
    )
    control_plane_policing_enabled: bool = Field(
        default=False, description="Whether Control Plane Policing (CoPP) or loopback protection filter is active"
    )
    default_drop_inbound: bool = Field(
        default=False, description="Whether the default perimeter policy denies all unsolicited inbound traffic"
    )
    active_acls_count: int = Field(default=0, description="Total number of active access control lists / firewall policies")


class EncryptionSecurity(SchemaBase):
    ipsec_configured: bool = Field(default=False, description="Whether IPSec tunnels are configured")
    ike_strong_crypto_only: bool = Field(
        default=True, description="Whether IKE/ISAKMP proposals exclude legacy algorithms (DES, MD5, DH-Group 1/2/5)"
    )
    ipsec_strong_crypto_only: bool = Field(
        default=True, description="Whether IPSec transform sets require AES-GCM or AES-256 with SHA-256/384/512"
    )
    weak_ciphers_detected: List[str] = Field(
        default_factory=list, description="Identified deprecated cryptographic suites in configuration"
    )


class LoggingSecurity(SchemaBase):
    logging_enabled: bool = Field(default=False, description="Whether system event logging is enabled")
    remote_syslog_servers: List[str] = Field(
        default_factory=list, description="List of configured remote SIEM/Syslog server endpoints"
    )
    logging_level: Optional[str] = Field(
        default="informational", description="Configured system logging severity trap level (e.g., informational, warnings)"
    )
    log_timestamps_enabled: bool = Field(
        default=False, description="Whether log messages include high-precision UTC/millisecond timestamps"
    )
    buffered_logging_size_bytes: Optional[int] = Field(
        default=None, description="Local circular log buffer allocation in bytes"
    )
    login_accounting_logged: bool = Field(
        default=False, description="Whether successful and failed administrative logins generate audit logs"
    )


class TimeSyncSecurity(SchemaBase):
    ntp_enabled: bool = Field(default=False, description="Whether Network Time Protocol (NTP) synchronization is enabled")
    ntp_servers: List[str] = Field(default_factory=list, description="Configured upstream authoritative NTP servers")
    ntp_authentication_enabled: bool = Field(
        default=False, description="Whether NTP packet authentication / MD5/SHA keys are verified"
    )
    timezone: Optional[str] = Field(default="UTC", description="Configured system timezone designation")


class ServicesSecurity(SchemaBase):
    snmp_enabled: bool = Field(default=False, description="Whether SNMP service is enabled")
    snmp_v3_only: bool = Field(
        default=False, description="Whether only secure SNMPv3 with authPriv is enabled and SNMPv1/v2c are disabled"
    )
    snmp_default_communities_removed: bool = Field(
        default=True, description="Whether default 'public' and 'private' SNMP community strings are deleted"
    )
    cdp_enabled: bool = Field(
        default=False, description="Whether Cisco Discovery Protocol is globally enabled (should be disabled on untrusted edges)"
    )
    lldp_enabled: bool = Field(default=False, description="Whether Link Layer Discovery Protocol is active")
    finger_service_disabled: bool = Field(default=True, description="Whether legacy finger daemon is deactivated")
    ip_source_routing_disabled: bool = Field(
        default=True, description="Whether IP source routing packet processing is disabled"
    )
    directed_broadcast_disabled: bool = Field(
        default=True, description="Whether IP directed broadcasts (Smurf amplification prevention) are disabled"
    )
    proxy_arp_disabled: bool = Field(default=True, description="Whether Proxy ARP is deactivated on routed interfaces")


class ManagementSecurity(SchemaBase):
    banner_motd_text: Optional[str] = Field(default=None, description="Raw banner text if present")
    login_delay_seconds: Optional[int] = Field(
        default=None, description="Delay penalty between failed interactive login attempts"
    )
    session_limit_per_user: Optional[int] = Field(
        default=None, description="Maximum concurrent administrative sessions allowed per operator"
    )
    tcp_keepalives_in_enabled: bool = Field(
        default=False, description="Whether TCP keepalives are enabled on incoming management connections"
    )


class NetworkSecurity(SchemaBase):
    spanning_tree_bpdu_guard_enabled: bool = Field(
        default=False, description="Whether Spanning Tree BPDU Guard is globally or per-edge enabled"
    )
    spanning_tree_root_guard_enabled: bool = Field(
        default=False, description="Whether STP Root Guard is configured on designated boundary ports"
    )
    dhcp_snooping_enabled: bool = Field(
        default=False, description="Whether DHCP Snooping is active on user VLANs to prevent rogue DHCP servers"
    )
    dynamic_arp_inspection_enabled: bool = Field(
        default=False, description="Whether Dynamic ARP Inspection (DAI) is enforced to prevent ARP poisoning"
    )
    ip_source_guard_enabled: bool = Field(
        default=False, description="Whether IP Source Guard is enabled to prevent IP spoofing attacks"
    )
    port_security_enabled: bool = Field(
        default=False, description="Whether Layer 2 MAC limit / Port Security is configured on access interfaces"
    )


class UniversalSecurityNormalization(SchemaBase):
    """
    Canonical Universal Security Normalization Document.
    Versioned, vendor-neutral, structured baseline for compliance rule evaluation.
    """

    schema_version: str = Field(default="1.0.0", description="Universal Security Schema specification version")
    normalized_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), description="Timestamp when normalization was executed"
    )
    source_vendor: str = Field(..., description="Detected vendor: cisco, juniper, fortinet, etc.")
    source_platform: Optional[str] = Field(default=None, description="Detected operating system/platform: ios, junos, fortios")
    raw_config_hash: str = Field(..., description="Cryptographic SHA-256 digest of original raw configuration file")
    parser_confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence score of parser extraction")

    # Modular Security Domains
    identity: DeviceIdentity = Field(default_factory=DeviceIdentity)
    authentication: AuthenticationSecurity = Field(default_factory=AuthenticationSecurity)
    authorization: AuthorizationSecurity = Field(default_factory=AuthorizationSecurity)
    remote_access: RemoteAccessSecurity = Field(default_factory=RemoteAccessSecurity)
    access_control: AccessControlSecurity = Field(default_factory=AccessControlSecurity)
    encryption: EncryptionSecurity = Field(default_factory=EncryptionSecurity)
    logging: LoggingSecurity = Field(default_factory=LoggingSecurity)
    time_sync: TimeSyncSecurity = Field(default_factory=TimeSyncSecurity)
    services: ServicesSecurity = Field(default_factory=ServicesSecurity)
    management: ManagementSecurity = Field(default_factory=ManagementSecurity)
    network_security: NetworkSecurity = Field(default_factory=NetworkSecurity)

    # Diagnostic & Unmapped constructs
    unparsed_constructs: List[str] = Field(
        default_factory=list, description="Lines or blocks that could not be deterministically normalized"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Arbitrary vendor-specific metadata preserved for evidence"
    )

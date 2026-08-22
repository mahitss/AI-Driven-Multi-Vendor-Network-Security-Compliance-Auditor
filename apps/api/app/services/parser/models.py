"""
NetVigil Universal Normalized Security Profile & Fact Models
Problem Statement: SIH26155 (NTRO)

Every security fact preserves:
- value: Strongly-typed normalized value
- evidence: Verbatim configuration text lines / blocks
- source_lines: 1-indexed line numbers where the evidence was located
- confidence: Extraction confidence score (1.0 for deterministic rule matches)
- method: "deterministic" or "ai_assisted"
- status: "extracted", "default_inferred", "unknown"
"""
from datetime import datetime, timezone
from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class SecurityFact(BaseModel, Generic[T]):
    """Generic container encapsulating a security property with provenance evidence."""

    value: T
    evidence: List[str] = Field(default_factory=list, description="Verbatim raw configuration text lines")
    source_lines: List[int] = Field(default_factory=list, description="1-indexed line numbers in raw configuration")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Extraction confidence rating")
    method: str = Field(default="deterministic", description="Extraction method: deterministic, heuristic, ai")
    status: str = Field(default="extracted", description="Fact status: extracted, default_inferred, unknown")

    @classmethod
    def create(
        cls,
        value: T,
        evidence: Optional[List[str]] = None,
        source_lines: Optional[List[int]] = None,
        confidence: float = 1.0,
        status: str = "extracted",
    ) -> "SecurityFact[T]":
        return cls(
            value=value,
            evidence=evidence or [],
            source_lines=source_lines or [],
            confidence=confidence,
            method="deterministic",
            status=status,
        )

    @classmethod
    def default_inferred(cls, default_value: T, reason: str = "Vendor baseline default") -> "SecurityFact[T]":
        return cls(
            value=default_value,
            evidence=[f"[Inferred from vendor baseline: {reason}]"],
            source_lines=[],
            confidence=0.85,
            method="deterministic",
            status="default_inferred",
        )


class UnknownItem(BaseModel):
    """Represents an unrecognized or unmapped configuration directive for Adaptive Training."""

    raw_text: str = Field(..., description="Verbatim unknown configuration line or block")
    line_number: Optional[int] = Field(default=None, description="Line number in source configuration")
    vendor: str = Field(..., description="Vendor context")
    category: str = Field(default="unrecognized_syntax", description="Classification category")
    confidence: float = Field(default=0.0, description="Confidence score")
    status: str = Field(default="unrecognized", description="Status for adaptive learning review")


class DeviceIdentityFacts(BaseModel):
    hostname: SecurityFact[str] = Field(
        default_factory=lambda: SecurityFact.default_inferred("unknown-node", "No hostname statement found")
    )
    domain_name: Optional[SecurityFact[str]] = None
    banner_motd_present: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "No banner directive found")
    )
    banner_legal_warning: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "No legal warning keyword in banner")
    )
    os_family: Optional[SecurityFact[str]] = None
    os_version: Optional[SecurityFact[str]] = None


class RemoteAccessFacts(BaseModel):
    ssh_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "SSH service not configured")
    )
    ssh_version: SecurityFact[int] = Field(
        default_factory=lambda: SecurityFact.default_inferred(1, "Legacy protocol default")
    )
    ssh_ciphers_secure: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(True, "Default ciphers")
    )
    telnet_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "Telnet not explicitly enabled")
    )
    http_server_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "HTTP server disabled")
    )
    https_server_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "HTTPS server not active")
    )
    vty_access_class_applied: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "No access-class/filter on VTY lines")
    )
    inactivity_timeout_minutes: Optional[SecurityFact[int]] = None


class AuthenticationFacts(BaseModel):
    aaa_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "AAA new-model not active")
    )
    password_encryption_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "Password encryption service not active")
    )
    enable_secret_configured: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "No enable secret detected")
    )
    enable_secret_type: Optional[SecurityFact[str]] = None
    local_users_count: SecurityFact[int] = Field(
        default_factory=lambda: SecurityFact.default_inferred(0, "No local users defined")
    )
    local_users: SecurityFact[List[str]] = Field(default_factory=lambda: SecurityFact.create([]))
    tacacs_servers: SecurityFact[List[str]] = Field(default_factory=lambda: SecurityFact.create([]))
    radius_servers: SecurityFact[List[str]] = Field(default_factory=lambda: SecurityFact.create([]))
    failed_login_lockout_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "No login lockout configured")
    )


class AuthorizationFacts(BaseModel):
    role_based_access_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "No RBAC policies found")
    )
    command_authorization_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "Command authorization not enforced")
    )
    accounting_commands_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "Command accounting not enabled")
    )


class LoggingFacts(BaseModel):
    logging_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "Logging not enabled")
    )
    remote_logging_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "No remote syslog server configured")
    )
    remote_syslog_servers: SecurityFact[List[str]] = Field(default_factory=lambda: SecurityFact.create([]))
    log_timestamps_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "Log timestamps not enabled")
    )
    buffered_logging_size_bytes: Optional[SecurityFact[int]] = None
    logging_level: Optional[SecurityFact[str]] = None


class TimeSyncFacts(BaseModel):
    ntp_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "No NTP configuration")
    )
    ntp_servers: SecurityFact[List[str]] = Field(default_factory=lambda: SecurityFact.create([]))
    ntp_authentication_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "NTP authentication not active")
    )
    timezone: Optional[SecurityFact[str]] = None


class AccessControlFacts(BaseModel):
    inbound_acls_count: SecurityFact[int] = Field(
        default_factory=lambda: SecurityFact.default_inferred(0, "No inbound ACLs")
    )
    control_plane_policing_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "Control plane policing not detected")
    )
    default_drop_inbound: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "Perimeter default drop not verified")
    )


class ServicesFacts(BaseModel):
    snmp_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "SNMP disabled")
    )
    snmp_v3_only: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "SNMPv1/v2c not explicitly disabled")
    )
    snmp_default_communities_removed: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(True, "Default public/private not detected")
    )
    cdp_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "CDP disabled or not present")
    )
    lldp_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "LLDP not active")
    )
    finger_disabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(True, "Finger service disabled")
    )
    proxy_arp_disabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(True, "Proxy ARP disabled")
    )
    ip_directed_broadcast_disabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(True, "Directed broadcast disabled")
    )


class ManagementFacts(BaseModel):
    banner_motd_text: Optional[SecurityFact[str]] = None
    login_delay_seconds: Optional[SecurityFact[int]] = None
    session_limit_per_user: Optional[SecurityFact[int]] = None


class NetworkSecurityFacts(BaseModel):
    spanning_tree_bpdu_guard_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "STP BPDU guard not enabled")
    )
    dhcp_snooping_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "DHCP snooping not enabled")
    )
    dynamic_arp_inspection_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "Dynamic ARP inspection not active")
    )
    port_security_enabled: SecurityFact[bool] = Field(
        default_factory=lambda: SecurityFact.default_inferred(False, "Port security not configured")
    )


class NormalizedSecurityProfile(BaseModel):
    """
    Complete Canonical Universal Security Profile.
    Every fact carries deterministic evidence, source line numbers, and confidence ratings.
    """

    schema_version: str = Field(default="1.1.0", description="Universal Security Normalization schema version")
    vendor: str = Field(..., description="Detected vendor: cisco, juniper, fortinet")
    platform: Optional[str] = Field(default=None, description="Detected operating system/platform")
    parser_name: str = Field(..., description="Parser implementation identifier")
    parser_version: str = Field(default="1.0.0", description="Parser engine version")
    parser_confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    facts_extracted_count: int = Field(default=0, description="Total count of deterministic security facts extracted")
    unknown_items_count: int = Field(default=0, description="Count of unparsed / unmapped configuration items")
    normalized_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Domain Fact Groups
    identity: DeviceIdentityFacts = Field(default_factory=DeviceIdentityFacts)
    remote_access: RemoteAccessFacts = Field(default_factory=RemoteAccessFacts)
    authentication: AuthenticationFacts = Field(default_factory=AuthenticationFacts)
    authorization: AuthorizationFacts = Field(default_factory=AuthorizationFacts)
    logging: LoggingFacts = Field(default_factory=LoggingFacts)
    time_sync: TimeSyncFacts = Field(default_factory=TimeSyncFacts)
    access_control: AccessControlFacts = Field(default_factory=AccessControlFacts)
    services: ServicesFacts = Field(default_factory=ServicesFacts)
    management: ManagementFacts = Field(default_factory=ManagementFacts)
    network_security: NetworkSecurityFacts = Field(default_factory=NetworkSecurityFacts)

    # Unknown Items & Raw Preservations
    unknown_items: List[UnknownItem] = Field(
        default_factory=list, description="Unrecognized directives preserved for Adaptive Training"
    )
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Diagnostic parser metadata")

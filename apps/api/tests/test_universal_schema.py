"""
Universal Security Schema Pydantic Model Validation Tests
"""
from datetime import datetime, timezone
import pytest
from app.schemas.universal_security_schema import (
    AuthenticationSecurity,
    DeviceIdentity,
    LoggingSecurity,
    RemoteAccessSecurity,
    UniversalSecurityNormalization,
)


def test_universal_schema_default_instantiation():
    schema = UniversalSecurityNormalization(
        source_vendor="cisco",
        source_platform="ios-xe",
        raw_config_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    )

    assert schema.schema_version == "1.0.0"
    assert schema.source_vendor == "cisco"
    assert schema.source_platform == "ios-xe"
    assert schema.identity.hostname == "unknown-node"
    assert schema.remote_access.ssh_version == 2
    assert schema.remote_access.telnet_enabled is False
    assert schema.logging.logging_enabled is False


def test_universal_schema_custom_population_and_serialization():
    schema = UniversalSecurityNormalization(
        source_vendor="juniper",
        source_platform="junos-srx",
        raw_config_hash="a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
        parser_confidence=0.98,
        identity=DeviceIdentity(
            hostname="FW-PERIMETER-01",
            domain_name="netvigil.internal",
            banner_motd_present=True,
            banner_legal_warning=True,
            os_family="JunOS",
            os_version="21.4R3-S2",
        ),
        authentication=AuthenticationSecurity(
            aaa_enabled=True,
            local_users_count=2,
            password_min_length=12,
            tacacs_servers=["10.100.20.50"],
        ),
        remote_access=RemoteAccessSecurity(
            ssh_enabled=True,
            ssh_version=2,
            ssh_ciphers_secure=True,
            telnet_enabled=False,
            http_server_enabled=False,
            https_server_enabled=True,
            vty_access_class_applied=True,
        ),
        logging=LoggingSecurity(
            logging_enabled=True,
            remote_syslog_servers=["10.100.20.50"],
            log_timestamps_enabled=True,
        ),
    )

    data = schema.model_dump()
    assert data["identity"]["hostname"] == "FW-PERIMETER-01"
    assert data["authentication"]["aaa_enabled"] is True
    assert data["remote_access"]["ssh_enabled"] is True
    assert data["remote_access"]["telnet_enabled"] is False
    assert len(data["logging"]["remote_syslog_servers"]) == 1

    # Round-trip JSON deserialization
    json_str = schema.model_dump_json()
    reconstructed = UniversalSecurityNormalization.model_validate_json(json_str)
    assert reconstructed.identity.hostname == "FW-PERIMETER-01"
    assert reconstructed.source_vendor == "juniper"

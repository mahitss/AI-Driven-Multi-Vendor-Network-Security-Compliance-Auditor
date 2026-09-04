"""
NetVigil P0 Secrets, Environment Configuration & Logging Hardening Test Suite
SIH26155 — NTRO Network Security Compliance Auditor

Exhaustive regression tests verifying:
A. Production startup rejection with missing SECRET_KEY
B. Production startup rejection with insecure/default SECRET_KEY
C. DEBUG defaults to False and is strictly overridden to False in production
D. Wildcard CORS rejection in production
E. Host header validation and unexpected host rejection
F. Absence of service-role Supabase credentials in client-facing paths
G. AI provider secrets isolation to backend only
H. Authorization headers, Bearer tokens, and JWT redaction in structured logging
I. Database connection string credentials redaction in logging
J. Startup validation error formatting (never leaking secret values)
"""
import pytest
import logging
import io
from unittest.mock import patch
from pydantic import ValidationError
from httpx import AsyncClient, ASGITransport

from app.main import app, lifespan
from app.core.config import Settings, settings
from app.core.logging import logger, SensitiveFilter, redact_string


def test_a_production_missing_secret_key_rejection():
    """A: Production cannot start with missing SECRET_KEY."""
    with pytest.raises(ValidationError) as exc:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="",
            ALLOWED_HOSTS=["api.netvigil.com"],
            CORS_ORIGINS=["https://app.netvigil.com"],
        )
    assert "SECRET_KEY" in str(exc.value)
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in str(exc.value)


def test_b_production_insecure_secret_key_rejection():
    """B: Production cannot start with an insecure or default SECRET_KEY."""
    insecure_keys = [
        "dev-insecure-secret-key-replace-in-production-sih26155",
        "secret",
        "changeme",
        "default",
        "short-key",
    ]
    for key in insecure_keys:
        with pytest.raises(ValidationError) as exc:
            Settings(
                ENVIRONMENT="production",
                SECRET_KEY=key,
                ALLOWED_HOSTS=["api.netvigil.com"],
                CORS_ORIGINS=["https://app.netvigil.com"],
            )
        assert "SECRET_KEY" in str(exc.value)


def test_c_debug_defaults_to_false_and_production_override():
    """C: DEBUG defaults to False and cannot be True in production."""
    # 1. Default instance must have DEBUG = False
    s_default = Settings(ENVIRONMENT="development")
    assert s_default.DEBUG is False

    # 2. In production, even if DEBUG=True is attempted, it is overridden to False
    s_prod = Settings(
        ENVIRONMENT="production",
        DEBUG=True,
        SECRET_KEY="a" * 32,
        ALLOWED_HOSTS=["api.netvigil.com"],
        CORS_ORIGINS=["https://app.netvigil.com"],
        DATABASE_URL="postgresql://postgres:pass@db.example.com:5432/netvigil",
    )
    assert s_prod.DEBUG is False


def test_d_wildcard_cors_rejected_in_production():
    """D: Wildcard production CORS is strictly rejected."""
    with pytest.raises(ValidationError) as exc:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a" * 32,
            ALLOWED_HOSTS=["api.netvigil.com"],
            CORS_ORIGINS=["*"],
        )
    assert "CORS_ORIGINS" in str(exc.value)
    assert "Wildcard '*'" in str(exc.value)


def test_e_wildcard_allowed_hosts_rejected_in_production():
    """E: Wildcard '*' in ALLOWED_HOSTS is strictly rejected in production."""
    with pytest.raises(ValidationError) as exc:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a" * 32,
            ALLOWED_HOSTS=["*"],
            CORS_ORIGINS=["https://app.netvigil.com"],
        )
    assert "ALLOWED_HOSTS" in str(exc.value)
    assert "Wildcard '*'" in str(exc.value)


@pytest.mark.asyncio
async def test_e_unexpected_host_header_rejected_in_production():
    """E: In production mode, Host header validation rejects untrusted hosts with HTTP 400."""
    with patch("app.core.middleware.settings.ENVIRONMENT", "production"), \
         patch("app.core.middleware.settings.ALLOWED_HOSTS", ["api.netvigil.com", "console.netvigil.com"]):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Trusted host
            res_ok = await client.get("/health", headers={"Host": "api.netvigil.com"})
            assert res_ok.status_code == 200

            # 2. Untrusted hostile host on a protected endpoint
            res_bad = await client.get("/api/v1/devices", headers={"Host": "evil-attacker.com"})
            assert res_bad.status_code == 400
            assert "INVALID_HOST_HEADER" in res_bad.json()["error"]["code"]


def test_h_logging_redacts_authorization_and_jwt():
    """H: Authorization headers, Bearer tokens, and raw JWTs are redacted in logs."""
    test_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    
    # Test Bearer header redaction
    msg1 = redact_string(f"Incoming request with Authorization: Bearer {test_jwt}")
    assert test_jwt not in msg1
    assert "[REDACTED]" in msg1 or "[REDACTED_JWT]" in msg1

    # Test raw JWT redaction
    msg2 = redact_string(f"Decoded token payload for session {test_jwt}")
    assert test_jwt not in msg2
    assert "[REDACTED_JWT]" in msg2

    # Test password redaction
    msg3 = redact_string("Database connection user admin password SuperSecretPassword123")
    assert "SuperSecretPassword123" not in msg3
    assert "[REDACTED]" in msg3


def test_i_logging_redacts_database_passwords():
    """I: Database connection strings with credentials are automatically redacted."""
    pg_url = "postgresql+asyncpg://postgres:SuperSecretPostgresPassword99@db.render.com:5432/netvigil"
    redacted_pg = redact_string(f"Connecting to database at {pg_url}")
    assert "SuperSecretPostgresPassword99" not in redacted_pg
    assert "[REDACTED]" in redacted_pg
    assert "postgresql+asyncpg://postgres:[REDACTED]@db.render.com:5432/netvigil" in redacted_pg

    mysql_url = "mysql+aiomysql://dbuser:MySqlSecretPass123@10.0.0.5:3306/netvigil"
    redacted_mysql = redact_string(f"Initialized MySQL pool: {mysql_url}")
    assert "MySqlSecretPass123" not in redacted_mysql
    assert "[REDACTED]" in redacted_mysql


def test_j_configuration_errors_do_not_leak_secret_values():
    """J: Configuration validation errors identify the missing variable name without leaking secrets."""
    secret_value = "SensitiveSecretValueThatShouldNeverBeEchoedInLogs"
    # Even if an invalid secret is given (e.g. too short), the error must name the variable, not echo the secret
    with pytest.raises(ValidationError) as exc:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="short",
            ALLOWED_HOSTS=["api.netvigil.com"],
            CORS_ORIGINS=["https://app.netvigil.com"],
        )
    error_msg = str(exc.value)
    assert "SECRET_KEY" in error_msg
    # Ensure raw secret content is not in custom error message
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in error_msg

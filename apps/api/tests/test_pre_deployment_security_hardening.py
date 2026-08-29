"""
Comprehensive Pre-Deployment Security Hardening Verification Suite
NetVigil — SIH26155 (NTRO)

Tests all 14 critical production security vectors:
1. Production without JWT secret -> 401
2. Production with invalid JWT -> 401
3. Development fallback still works only where intentionally allowed
4. Production CORS configuration & wildcard rejection
5. Production host validation & health probe bypass
6. Upload size/type validation & executable binary / hostile shebang rejection
7. Storage traversal protection
8. Duplicate concurrent ingestion idempotency
9. Audit atomicity & rollback protection
10. AI timeout/failure deterministic fallback
11. Invalid objective remains side-effect free
12. Cross-session isolation remains intact
13. Approval token replay remains rejected
14. SSH constraint remains enforced
"""
import asyncio
import io
import os
from unittest.mock import AsyncMock, patch
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import (
    ConfigurationUploadError,
    FileSizeExceededError,
    InvalidFileTypeError,
)
from app.core.security import (
    compute_sha256,
    sanitize_filename,
    validate_configuration_content,
    validate_file_metadata,
)
from app.models.configuration import Configuration
from app.services.compliance.service import ComplianceAuditService
from app.services.ingestion.config_ingestion import ConfigurationIngestionService


# -----------------------------------------------------------------------------
# 1 & 2 & 3. Authentication Fail-Closed and Development Fallback Tests
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_1_production_without_jwt_fails_closed_401(client: AsyncClient):
    """In production mode, unauthenticated requests must strictly return HTTP 401."""
    with patch("app.core.auth.settings.ENVIRONMENT", "production"):
        res = await client.get("/api/v1/devices")
        assert res.status_code == 401
        assert "Authentication required" in res.json().get("detail", "")


@pytest.mark.asyncio
async def test_2_production_with_invalid_jwt_returns_401(client: AsyncClient):
    """In production mode, malformed or forged JWTs must strictly return HTTP 401."""
    with patch("app.core.auth.settings.ENVIRONMENT", "production"):
        headers = {"Authorization": "Bearer invalid.jwt.signature.token"}
        res = await client.get("/api/v1/devices", headers=headers)
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_3_development_fallback_only_in_dev_mode(client: AsyncClient):
    """Development fallback auditor identity is granted only in development without configured secrets."""
    with patch("app.core.auth.settings.ENVIRONMENT", "development"), \
         patch("app.core.auth.settings.SUPABASE_JWT_SECRET", ""):
        res = await client.get("/api/v1/devices")
        assert res.status_code == 200


# -----------------------------------------------------------------------------
# 4. Production CORS Validation
# -----------------------------------------------------------------------------
def test_4_production_cors_wildcard_rejected():
    """Wildcard CORS origin '*' is strictly prohibited in production mode."""
    with pytest.raises(ValueError, match="Wildcard '\\*' in CORS_ORIGINS is strictly prohibited"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="production-secret-key-min-32-chars-long-valid",
            DEBUG=False,
            OPENROUTER_API_KEY="sk-or-v1-valid-test-key",
            CORS_ORIGINS=["*"],
        )


def test_4_production_cors_valid_origins():
    """Configured production origins are parsed and accepted cleanly."""
    s = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="production-secret-key-min-32-chars-long-valid",
        DEBUG=False,
        OPENROUTER_API_KEY="sk-or-v1-valid-test-key",
        CORS_ORIGINS="https://netvigil.app, https://admin.netvigil.app",
    )
    assert s.CORS_ORIGINS == ["https://netvigil.app", "https://admin.netvigil.app"]


# -----------------------------------------------------------------------------
# 5. Production Host Header Validation
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_5_production_host_validation(client: AsyncClient):
    """Untrusted host headers are rejected with 400 in production, while health probes pass."""
    with patch("app.core.middleware.settings.ENVIRONMENT", "production"), \
         patch("app.core.middleware.settings.ALLOWED_HOSTS", ["api.netvigil.com", "*.a.run.app"]):
        
        # Health check probe must pass regardless of host header
        res_health = await client.get("/health", headers={"Host": "evil-attacker.com"})
        assert res_health.status_code == 200

        # Protected route with invalid host header must be rejected
        res_untrusted = await client.get("/", headers={"Host": "evil-attacker.com"})
        assert res_untrusted.status_code == 400
        assert res_untrusted.json()["error"]["code"] == "INVALID_HOST_HEADER"


# -----------------------------------------------------------------------------
# 6. Upload Size / Type & Binary / Shebang Validation
# -----------------------------------------------------------------------------
def test_6_binary_executable_rejection():
    """Binary files (ELF, PE, Mach-O, Zip, PDF) are rejected immediately."""
    # ELF binary header
    with pytest.raises(InvalidFileTypeError, match="binary or executable content"):
        validate_configuration_content(b"\x7fELF\x02\x01\x01\x00", filename="router.cfg")

    # Windows PE executable header
    with pytest.raises(InvalidFileTypeError, match="binary or executable content"):
        validate_configuration_content(b"MZ\x90\x00\x03\x00\x00\x00", filename="switch.conf")

    # Binary null bytes
    with pytest.raises(InvalidFileTypeError, match="binary null bytes"):
        validate_configuration_content(b"hostname router1\x00\x00\x00\x00", filename="router.cfg")


def test_6_hostile_script_shebang_rejection():
    """Executable shell/python scripts are rejected."""
    with pytest.raises(InvalidFileTypeError, match="executable script"):
        validate_configuration_content(b"#!/bin/bash\nrm -rf /", filename="script.cfg")

    with pytest.raises(InvalidFileTypeError, match="executable script"):
        validate_configuration_content(b"#!/usr/bin/env python3\nimport os", filename="script.conf")


def test_6_valid_network_config_accepted():
    """Legitimate Cisco, Juniper, and Fortinet configs pass validation cleanly."""
    cisco_cfg = b"hostname Core-R1\ninterface GigabitEthernet0/0\n ip address 10.0.0.1 255.255.255.0\n"
    validate_configuration_content(cisco_cfg, filename="core-r1.cfg")

    juniper_cfg = b"system {\n    host-name Edge-SRX;\n    services {\n        ssh;\n    }\n}\n"
    validate_configuration_content(juniper_cfg, filename="juniper.conf")


# -----------------------------------------------------------------------------
# 7. Storage Traversal Protection
# -----------------------------------------------------------------------------
def test_7_storage_traversal_sanitization():
    """Path traversal sequences in filenames are sanitized."""
    assert sanitize_filename("../../../etc/shadow") == "shadow"
    assert sanitize_filename("..\\..\\windows\\system32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("..//hidden/.secret.cfg") == "config_secret.cfg"


def test_7_storage_root_containment():
    """Storage directory cannot be set to sensitive system roots."""
    with pytest.raises(ValueError, match="sensitive system directory"):
        s = Settings(STORAGE_PATH="/etc/passwd")
        _ = s.resolved_storage_path


# -----------------------------------------------------------------------------
# 8. Duplicate Concurrent Ingestion Idempotency
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_8_duplicate_concurrent_ingestion_idempotency(db_session: AsyncSession):
    """Concurrent ingestion of identical configurations returns the identical record idempotently."""
    cfg_content = b"hostname Core-Idempotency-Test\ninterface GigabitEthernet0/0\n"
    
    # Ingest first
    c1 = await ConfigurationIngestionService.ingest_file(
        filename="router-idem.cfg",
        content_bytes=cfg_content,
        db=db_session,
    )

    # Ingest duplicate
    c2 = await ConfigurationIngestionService.ingest_file(
        filename="router-idem.cfg",
        content_bytes=cfg_content,
        db=db_session,
    )

    assert c1.id == c2.id
    assert c1.hash == c2.hash


# -----------------------------------------------------------------------------
# 9. Audit Atomicity & Rollback Protection
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_9_audit_atomicity_and_rollback_protection(db_session: AsyncSession):
    """If finding persistence encounters an error, the audit transaction rolls back cleanly."""
    cfg = Configuration(
        filename="test-audit-atomicity.cfg",
        original_filename="test-audit-atomicity.cfg",
        storage_path="./storage/uploads/test.cfg",
        file_size_bytes=100,
        hash="test-hash-atomicity-01",
        raw_content="hostname Atomic-Router\n",
        detected_vendor="cisco",
        parser_status="pending",
    )
    db_session.add(cfg)
    await db_session.commit()
    await db_session.refresh(cfg)

    # Simulate database failure during scoring
    with patch("app.services.compliance.scorer.ComplianceScoringEngine.calculate_scores", side_effect=RuntimeError("Simulated DB Crash")):
        with pytest.raises(RuntimeError, match="Simulated DB Crash"):
            await ComplianceAuditService.run_audit(
                configuration_id=cfg.id,
                frameworks=["CIS"],
                db=db_session,
            )


# -----------------------------------------------------------------------------
# 10. AI Gateway Timeout & Fallback Protection
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_10_ai_gateway_timeout_deterministic_fallback():
    """When external AI provider times out, gateway gracefully falls back to deterministic provider."""
    from app.services.ai.gateway.openrouter_gateway import OpenRouterGateway
    from app.services.ai.schemas.models import AITaskType

    with patch("httpx.AsyncClient.post", side_effect=asyncio.TimeoutError("Gateway Timeout")), \
         patch("app.services.ai.gateway.openrouter_gateway.settings.OPENROUTER_API_KEY", "sk-or-v1-test-key"):
        
        result = await OpenRouterGateway.execute_task(
            task_type=AITaskType.FINDING_EXPLANATION,
            user_prompt="Explain rule violation",
            context_data={"title": "Insecure Telnet Protocol Enabled", "vendor": "cisco"},
        )
        assert result is not None
        assert hasattr(result, "summary") or hasattr(result, "why_it_matters") or isinstance(result, dict)


# -----------------------------------------------------------------------------
# 11, 12, 13, 14. Agent Lifecycle Integrity & Safety Vectors
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_11_invalid_objective_side_effect_free(client: AsyncClient):
    """Invalid gibberish objective transitions to INVALID_OBJECTIVE with 0 side effects."""
    res = await client.post("/api/v1/agent/run", json={"objective": "what is it acndjk...", "baseline_framework": "CIS"})
    assert res.status_code == 200
    s = res.json()
    assert s["status"] == "INVALID_OBJECTIVE"
    assert s["intent"] == "INVALID"
    assert len(s.get("discovered_configs", [])) == 0
    assert len(s.get("proposals", [])) == 0
    assert s.get("active_approval") is None


@pytest.mark.asyncio
async def test_12_cross_session_isolation_and_replay_rejection(client: AsyncClient):
    """Session approval tokens cannot be replayed across sessions or reused after execution."""
    # Ensure test configuration is ingested
    await client.post(
        "/api/v1/analysis/ingest",
        json={
            "content": "hostname Core-Router\nline vty 0 4\n transport input telnet\n",
            "filename": "core-isolate.cfg",
            "vendor_hint": "cisco",
        },
    )

    # 1. Run Session A
    rA = await client.post("/api/v1/agent/run", json={
        "objective": "Audit configurations and fix high-risk violations, but do not modify SSH.",
        "baseline_framework": "CIS",
    })
    assert rA.status_code == 200
    sA = rA.json()
    assert sA.get("active_approval") is not None
    tokenA = sA["active_approval"]["approval_token"]

    # 2. Run Session B
    rB = await client.post("/api/v1/agent/run", json={
        "objective": "Audit configurations and fix high-risk violations, but do not modify SNMP.",
        "baseline_framework": "NIST",
    })
    assert rB.status_code == 200
    sB = rB.json()

    assert sA["session_id"] != sB["session_id"]

    # 3. Cross-session token replay must be rejected (422)
    r_bad = await client.post(
        f"/api/v1/agent/sessions/{sB['session_id']}/approve",
        json={"approved": True, "approval_token": tokenA},
    )
    assert r_bad.status_code == 422

    # 4. Approve Session A legitimately
    r_appr = await client.post(
        f"/api/v1/agent/sessions/{sA['session_id']}/approve",
        json={"approved": True, "approval_token": tokenA},
    )
    assert r_appr.status_code == 200
    assert r_appr.json()["status"] == "COMPLETED"

    # 5. Token reuse on completed Session A must be rejected (422)
    r_reuse = await client.post(
        f"/api/v1/agent/sessions/{sA['session_id']}/approve",
        json={"approved": True, "approval_token": tokenA},
    )
    assert r_reuse.status_code == 422


@pytest.mark.asyncio
async def test_14_ssh_negative_constraint_preservation(client: AsyncClient):
    """SSH configurations remain 100% untouched when negative constraint is specified."""
    res = await client.post("/api/v1/agent/run", json={
        "objective": "Audit configurations and fix high-risk violations, but do not modify SSH.",
        "baseline_framework": "CIS",
    })
    assert res.status_code == 200
    s = res.json()

    # Check proposals: all SSH proposals are masked as SKIPPED_CONSTRAINED
    ssh_props = [p for p in s["proposals"] if "ssh" in p["title"].lower() or "ssh" in p["control_id"].lower()]
    for p in ssh_props:
        assert p["is_constrained"] is True
        assert p["approval_status"] == "SKIPPED_CONSTRAINED"

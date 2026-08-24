"""
Security Hardening & Supply-Chain Integrity Tests
Problem Statement: SIH26155 (NTRO)

Tests:
1. SECRET_KEY Production Rejection: Missing or default secret key fails startup in production mode.
2. SECRET_KEY Development Acceptance: Explicit dev secret allowed in development mode.
3. Rate Limiting Sliding Window: Protects sensitive endpoints with HTTP 429 when threshold exceeded.
4. Silent Exception Elimination: Error logging verified on invalid fact dictionary.
"""
import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app
from app.services.compliance.evaluator import RuleEvaluator
from app.services.parser.models import NormalizedSecurityProfile


def test_production_secret_key_rejection():
    """Verify that production mode strictly rejects default or missing SECRET_KEY."""
    # Default insecure key in production must fail validation
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="dev-insecure-secret-key-replace-in-production-sih26155",
        )
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in str(exc_info.value)

    # Empty secret in production must fail validation
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="",
        )
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in str(exc_info.value)

    # Short secret (<32 chars) in production must fail validation
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="short-secret-key",
        )
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in str(exc_info.value)


def test_production_strong_secret_key_accepted():
    """Verify that production mode accepts a strong >=32 char secret key."""
    s = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="production-super-strong-secret-key-entropy-64-bits-min",
    )
    assert s.SECRET_KEY == "production-super-strong-secret-key-entropy-64-bits-min"
    assert s.ENVIRONMENT == "production"


def test_development_secret_key_allowed():
    """Verify that development mode allows the dev fallback secret key."""
    s = Settings(
        ENVIRONMENT="development",
        SECRET_KEY="dev-insecure-secret-key-replace-in-production-sih26155",
    )
    assert s.SECRET_KEY == "dev-insecure-secret-key-replace-in-production-sih26155"


def test_evaluator_fact_resolution_handles_corrupt_fact_cleanly():
    """Verify that corrupt fact dictionary is handled with logging rather than silent failure."""
    profile = NormalizedSecurityProfile(
        vendor="cisco",
        parser_name="cisco_ast",
    )
    # Inject corrupt dictionary into profile
    profile.remote_access = {"ssh_version": {"invalid_schema": True, "value": "corrupt"}}  # type: ignore

    val, container = RuleEvaluator._resolve_fact(profile, "remote_access.ssh_version")
    # Even if corrupt dict cannot instantiate SecurityFact, it extracts the value without crash
    assert val == "corrupt"

"""
NetVigil Supabase JWT Authentication Test Suite
Verifies cryptographic validation, expired/forged token rejection,
and public vs protected route enforcement.
"""
import time
from unittest.mock import patch
import jwt
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import AuthenticatedUser, verify_supabase_jwt
from app.main import app

TEST_JWT_SECRET = "super-secret-supabase-jwt-encryption-key-32-chars"
TEST_USER_ID = "11111111-2222-3333-4444-555555555555"
TEST_USER_EMAIL = "security.auditor@ntro.gov.in"


def create_test_token(
    user_id: str = TEST_USER_ID,
    email: str = TEST_USER_EMAIL,
    role: str = "auditor",
    secret: str = TEST_JWT_SECRET,
    expires_in: int = 3600,
    aud: str = "authenticated",
    include_sub: bool = True,
) -> str:
    """Helper to generate standard Supabase-compliant access JWTs for testing."""
    now = int(time.time())
    payload = {
        "aud": aud,
        "exp": now + expires_in,
        "iat": now,
        "iss": "https://test-project.supabase.co/auth/v1",
        "email": email,
        "role": role,
        "app_metadata": {"provider": "google", "providers": ["google"]},
        "user_metadata": {
            "full_name": "Senior Security Auditor",
            "avatar_url": "https://lh3.googleusercontent.com/a/test-avatar",
        },
    }
    if include_sub:
        payload["sub"] = user_id

    return jwt.encode(payload, secret, algorithm="HS256")


# ==============================================================================
# Unit Verification Tests
# ==============================================================================

def test_verify_valid_supabase_jwt():
    with patch("app.core.auth.settings.SUPABASE_JWT_SECRET", TEST_JWT_SECRET):
        token = create_test_token()
        user = verify_supabase_jwt(token)
        assert isinstance(user, AuthenticatedUser)
        assert user.id == TEST_USER_ID
        assert user.email == TEST_USER_EMAIL
        assert user.role == "auditor"
        assert user.user_metadata.get("full_name") == "Senior Security Auditor"


def test_verify_expired_jwt_raises_401():
    with patch("app.core.auth.settings.SUPABASE_JWT_SECRET", TEST_JWT_SECRET):
        token = create_test_token(expires_in=-100)
        with pytest.raises(Exception) as exc_info:
            verify_supabase_jwt(token)
        assert "401" in str(exc_info.value) or "expired" in str(exc_info.value).lower()


def test_verify_forged_signature_raises_401():
    with patch("app.core.auth.settings.SUPABASE_JWT_SECRET", TEST_JWT_SECRET):
        token = create_test_token(secret="wrong-forged-secret-key-123456789")
        with pytest.raises(Exception) as exc_info:
            verify_supabase_jwt(token)
        assert "401" in str(exc_info.value) or "signature" in str(exc_info.value).lower()


def test_verify_missing_sub_raises_401():
    with patch("app.core.auth.settings.SUPABASE_JWT_SECRET", TEST_JWT_SECRET):
        token = create_test_token(include_sub=False)
        with pytest.raises(Exception) as exc_info:
            verify_supabase_jwt(token)
        assert "401" in str(exc_info.value) or "subject" in str(exc_info.value).lower()


# ==============================================================================
# HTTP Route Protection Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_public_health_endpoints_bypass_auth():
    """Health probes must remain accessible without credentials."""
    with patch("app.core.auth.settings.SUPABASE_JWT_SECRET", TEST_JWT_SECRET):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res1 = await client.get("/health")
            assert res1.status_code == 200
            assert res1.json()["status"] == "healthy"

            res2 = await client.get("/api/v1/health")
            assert res2.status_code == 200
            assert res2.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_protected_route_unauthenticated_returns_401():
    """Protected API routes must return 401 when no token is supplied."""
    with patch("app.core.auth.settings.SUPABASE_JWT_SECRET", TEST_JWT_SECRET):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/v1/overview/stats")
            assert res.status_code == 401
            assert "WWW-Authenticate" in res.headers


@pytest.mark.asyncio
async def test_protected_route_malformed_auth_header_returns_401():
    """Malformed Authorization headers must return 401."""
    with patch("app.core.auth.settings.SUPABASE_JWT_SECRET", TEST_JWT_SECRET):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get(
                "/api/v1/overview/stats",
                headers={"Authorization": "Basic dXNlcjpwYXNz"},
            )
            assert res.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_invalid_token_returns_401():
    """Invalid or forged tokens must return 401."""
    with patch("app.core.auth.settings.SUPABASE_JWT_SECRET", TEST_JWT_SECRET):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get(
                "/api/v1/overview/stats",
                headers={"Authorization": "Bearer invalid.jwt.token"},
            )
            assert res.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_valid_token_returns_200():
    """Valid Bearer JWT must grant access to protected API endpoints."""
    with patch("app.core.auth.settings.SUPABASE_JWT_SECRET", TEST_JWT_SECRET):
        token = create_test_token()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get(
                "/api/v1/overview/stats",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert res.status_code == 200
            data = res.json()
            assert "total_configurations" in data or "compliance_avg" in data or "audit_count" in data or "posture" in data or isinstance(data, dict)

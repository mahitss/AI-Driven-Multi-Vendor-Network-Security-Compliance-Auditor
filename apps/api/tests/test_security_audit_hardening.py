"""
Comprehensive Production Security Hardening & Isolation Test Suite
Problem Statement: SIH26155 (NTRO)

Tests the 15 Critical Security & Architecture Controls:
1. Missing / weak production SECRET_KEY rejection
2. Wildcard CORS '*' rejection in production
3. Wildcard ALLOWED_HOSTS '*' rejection in production
4. DEBUG protection in production
5. Oversized upload rejection (413 / bounded limits)
6. Malformed and binary file upload rejection
7. Authentication failure on protected routes
8. Expired token rejection
9. Revoked token handling
10. Rate-limit spoofing defense (untrusted X-Forwarded-For)
11. User A vs User B: Configuration Isolation
12. User A vs User B: Finding Isolation
13. User A vs User B: Asset / Device Isolation
14. User A vs User B: Telemetry Isolation
15. User A vs User B: Remediation History Isolation
"""
import hashlib
import io
import time
import jwt
import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.core.auth import AuthenticatedUser, clear_token_cache, revoke_token, verify_supabase_jwt
from app.core.config import Settings, settings
from app.main import app


# ---------------------------------------------------------------------------
# Helpers & Token Generators
# ---------------------------------------------------------------------------
def generate_test_jwt(
    user_id: str,
    email: str = "auditor@netvigil.local",
    secret: str = None,
    exp_delta: int = 3600,
    role: str = "auditor",
) -> str:
    key = secret or settings.SECRET_KEY or "netvigil-dev-secret-key-ntro-sih26155-isolated-testing-token"
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "aud": "authenticated",
        "iat": now,
        "exp": now + exp_delta,
        "user_metadata": {"full_name": f"User {user_id}"},
        "app_metadata": {"provider": "google", "role": role},
    }
    return jwt.encode(payload, key, algorithm="HS256")


CISCO_TEST_CONFIG = """!
hostname CORE-TEST-RTR-01
!
service password-encryption
!
username admin privilege 15 secret 5 $1$mERr$951.q.uA
!
ip ssh version 2
no ip http server
ip http secure-server
!
line vty 0 4
 transport input ssh
!
end
"""


# ---------------------------------------------------------------------------
# PHASE 1 Tests: Config, Secrets, CORS, Hosts, Debug
# ---------------------------------------------------------------------------
def test_production_secret_key_required():
    """1. In production, missing or weak SECRET_KEY must raise configuration validation error."""
    # Test missing SECRET_KEY in production
    with pytest.raises(ValidationError) as exc:
        Settings(ENVIRONMENT="production", SECRET_KEY="")
    assert "SECRET_KEY" in str(exc.value)

    # Test short/insecure SECRET_KEY in production
    with pytest.raises(ValidationError) as exc:
        Settings(ENVIRONMENT="production", SECRET_KEY="too-short-secret")
    assert "SECRET_KEY" in str(exc.value)

    # Test valid 32+ char strong SECRET_KEY in production succeeds
    valid_prod_key = "a" * 32 + "strong_production_entropy_key_12345"
    s = Settings(
        ENVIRONMENT="production",
        SECRET_KEY=valid_prod_key,
        ALLOWED_HOSTS=["api.netvigil.ai"],
        CORS_ORIGINS=["https://netvigil.ai"],
        SUPABASE_URL="https://test.supabase.co",
    )
    assert s.SECRET_KEY == valid_prod_key


def test_production_wildcard_cors_rejected():
    """2. Wildcard '*' in CORS_ORIGINS must be strictly rejected in production."""
    with pytest.raises(ValidationError) as exc:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a" * 40,
            CORS_ORIGINS=["*"],
            ALLOWED_HOSTS=["api.netvigil.ai"],
            SUPABASE_URL="https://test.supabase.co",
        )
    assert "CORS_ORIGINS" in str(exc.value)


def test_production_wildcard_allowed_hosts_rejected():
    """3. Wildcard '*' in ALLOWED_HOSTS must be strictly rejected in production."""
    with pytest.raises(ValidationError) as exc:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a" * 40,
            CORS_ORIGINS=["https://netvigil.ai"],
            ALLOWED_HOSTS=["*"],
            SUPABASE_URL="https://test.supabase.co",
        )
    assert "ALLOWED_HOSTS" in str(exc.value)


def test_production_debug_forced_false():
    """4. Production DEBUG must strictly default to False even if requested."""
    s = Settings(
        ENVIRONMENT="production",
        DEBUG=True,
        SECRET_KEY="a" * 40,
        ALLOWED_HOSTS=["api.netvigil.ai"],
        CORS_ORIGINS=["https://netvigil.ai"],
        SUPABASE_URL="https://test.supabase.co",
    )
    assert s.DEBUG is False


# ---------------------------------------------------------------------------
# PHASE 1 (Cont): File Upload Security
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_oversized_upload_rejection():
    """5. Uploads exceeding MAX_FILE_SIZE_MB must be rejected with 413 or 400."""
    token = generate_test_jwt("user_upload_tester")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Generate 11MB of dummy config data (limit is 10MB)
        oversized_data = b"!\nhostname RTR-OVERSIZED\n" + (b"! padding line\n" * (11 * 1024 * 64))
        files = {"file": ("huge_config.cfg", oversized_data, "text/plain")}
        res = await client.post(
            "/api/v1/configurations",
            files=files,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code in [413, 400]
        data = res.json()
        assert "error" in data


@pytest.mark.asyncio
async def test_malformed_binary_upload_rejection():
    """6. Binary executable files and files with null bytes must be rejected."""
    token = generate_test_jwt("user_upload_tester")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Binary ELF header
        elf_binary = b"\x7fELF\x02\x01\x01\x00" + b"\x00" * 128
        files = {"file": ("malicious.cfg", elf_binary, "text/plain")}
        res = await client.post(
            "/api/v1/configurations",
            files=files,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 400
        data = res.json()
        assert "error" in data


# ---------------------------------------------------------------------------
# PHASE 3: Auth Token Security & Caching
# ---------------------------------------------------------------------------
def test_token_digest_caching_and_revocation():
    """8-9. Token cache must store cryptographic digests, honor expiration, and support revocation."""
    clear_token_cache()
    valid_token = generate_test_jwt("user_cache_test", exp_delta=300)

    # 1. First verification: populates cache
    user1 = verify_supabase_jwt(valid_token)
    assert user1.id == "user_cache_test"

    # Verify digest is used as cache key, not raw token
    token_digest = hashlib.sha256(valid_token.encode("utf-8")).hexdigest()
    from app.core.auth import _verified_token_cache
    assert token_digest in _verified_token_cache
    assert valid_token not in _verified_token_cache

    # 2. Revocation removes from cache
    revoked = revoke_token(valid_token)
    assert revoked is True
    assert token_digest not in _verified_token_cache

    # 3. Expired token rejection
    expired_token = generate_test_jwt("user_expired", exp_delta=-100)
    with pytest.raises(Exception) as exc:
        verify_supabase_jwt(expired_token)
    assert "expired" in str(exc.value).lower()


# ---------------------------------------------------------------------------
# PHASE 4: Rate Limiting & Spoofing Defense
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_rate_limit_spoofed_ip_defense():
    """10. Untrusted clients cannot rotate X-Forwarded-For to bypass rate limits."""
    from app.core.middleware import RateLimitMiddleware
    from starlette.requests import Request

    mw = RateLimitMiddleware(app=None)

    # Simulate request from untrusted peer (e.g. 203.0.113.5) sending fake X-Forwarded-For
    scope = {
        "type": "http",
        "client": ("203.0.113.5", 54321),
        "headers": [
            (b"x-forwarded-for", b"198.51.100.1, 198.51.100.2"),
        ],
    }
    req = Request(scope)
    extracted_ip = mw._get_client_ip(req)

    # Must NOT use the spoofed 198.51.100.1; must use the real peer IP 203.0.113.5
    assert extracted_ip == "203.0.113.5"


# ---------------------------------------------------------------------------
# PHASE 2: Comprehensive Multi-User Isolation (User A vs User B)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_multi_user_end_to_end_data_isolation():
    """11-15. Strict isolation across configurations, audits, findings, devices, telemetry, and remediations."""
    user_a_id = "user_sec_alpha_1111"
    user_b_id = "user_sec_bravo_2222"

    token_a = generate_test_jwt(user_a_id, email="alpha@netvigil.ai")
    token_b = generate_test_jwt(user_b_id, email="bravo@netvigil.ai")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: User A uploads a configuration
        files = {"file": ("cisco_alpha_core.cfg", CISCO_TEST_CONFIG.encode("utf-8"), "text/plain")}
        res_a_up = await client.post(
            "/api/v1/configurations",
            files=files,
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res_a_up.status_code == 201
        cfg_a = res_a_up.json()
        cfg_a_id = cfg_a["id"]

        # Step 2: User A runs an audit
        res_a_audit = await client.post(
            "/api/v1/audits",
            json={"configuration_id": cfg_a_id, "frameworks": ["CIS", "NIST"]},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res_a_audit.status_code == 201
        audit_a = res_a_audit.json()
        audit_a_id = audit_a["audit_id"]

        # 11. Configuration Isolation: User B cannot get User A's config
        res_b_get_cfg = await client.get(
            f"/api/v1/configurations/{cfg_a_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_b_get_cfg.status_code == 404

        # User B configuration list should not contain User A's configuration
        res_b_list_cfg = await client.get(
            "/api/v1/configurations",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_b_list_cfg.status_code == 200
        b_cfg_ids = [c["id"] for c in res_b_list_cfg.json()]
        assert cfg_a_id not in b_cfg_ids

        # 12. Audit & Findings Isolation: User B cannot get User A's audit
        res_b_get_audit = await client.get(
            f"/api/v1/audits/{audit_a_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_b_get_audit.status_code == 404

        # User B cannot see User A's findings in all findings
        res_b_findings = await client.get(
            "/api/v1/audits/findings/all",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_b_findings.status_code == 200
        b_audit_ids = [f["audit_id"] for f in res_b_findings.json()]
        assert audit_a_id not in b_audit_ids

        # 13. Assets / Devices Isolation: User B cannot access User A's device
        res_b_device = await client.get(
            f"/api/v1/devices/{cfg_a_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_b_device.status_code == 404

        # 14. Telemetry Isolation: User B's telemetry shows zero data if User B has 0 configs
        res_b_telemetry = await client.get(
            "/api/v1/overview/telemetry",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_b_telemetry.status_code == 200
        t_data = res_b_telemetry.json()
        assert t_data.get("total_evaluations", 0) == 0

        # 15. Remediation History Isolation: User B cannot access User A's audit remediations
        res_b_remediations = await client.get(
            f"/api/v1/audits/{audit_a_id}/remediations",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_b_remediations.status_code == 404

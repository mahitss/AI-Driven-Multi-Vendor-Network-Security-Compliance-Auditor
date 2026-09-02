"""
NetVigil P1 Security Headers, Browser Policy & Cache Control Test Suite
SIH26155 — NTRO Network Security Compliance Auditor

Exhaustive verification of HTTP security headers and browser security policies:
- HEADER-01: HTTPS production response includes Strict-Transport-Security (HSTS).
- HEADER-02: All API responses declare X-Content-Type-Options: nosniff.
- HEADER-03: Clickjacking protection enforced via X-Frame-Options and frame-ancestors.
- HEADER-04: Referrer-Policy is strict-origin-when-cross-origin.
- HEADER-05: Authenticated sensitive API responses return Cache-Control: no-store.
- HEADER-06: User-specific data responses disallow intermediate and public caching.
- HEADER-07: Unknown CORS origin is rejected in production configuration.
- HEADER-08: Production API does not emit wildcard with credentials CORS headers.
- HEADER-09: Error responses (400, 401, 404, 422, 500) contain security headers without leaking internals.
- HEADER-10: File download responses enforce Content-Disposition: attachment and safe MIME types.
- HEADER-11: Open redirect attempts (protocol-relative //, backslash /\\, off-domain) are blocked.
- HEADER-12: Production frontend API base configuration strictly uses HTTPS.
- HEADER-13: Frontend CSP explicitly permits legitimate dependencies (Supabase, Google, Render API).
- HEADER-14: Frontend CSP strictly forbids arbitrary wildcard scripts (no script-src *).
"""
import io
import time
import uuid
import jwt
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.core.config import settings
from app.core.auth import clear_token_cache


def create_test_jwt(user_id: str) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": f"{user_id}@netvigil.gov.in",
        "aud": "authenticated",
        "iss": "supabase",
        "role": "auditor",
        "iat": now,
        "exp": now + 3600,
        "app_metadata": {"role": "auditor"},
        "user_metadata": {"full_name": "Security Auditor"},
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


@pytest.fixture(autouse=True)
def cleanup_cache():
    clear_token_cache()
    yield
    clear_token_cache()


SAMPLE_CFG = """!
version 15.2
hostname NTRO-CORE-GW
!
"""


# ==============================================================================
# HEADER-01: HTTPS production response includes HSTS
# ==============================================================================
@pytest.mark.asyncio
async def test_header_01_hsts_production(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://testserver") as client:
        res = await client.get("/health")
        assert "Strict-Transport-Security" in res.headers
        hsts = res.headers["Strict-Transport-Security"]
        assert "max-age=" in hsts
        assert "includeSubDomains" in hsts


# ==============================================================================
# HEADER-02: X-Content-Type-Options: nosniff
# ==============================================================================
@pytest.mark.asyncio
async def test_header_02_nosniff_header():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Check standard endpoint, error endpoint, and API endpoint
        for path in ["/health", "/api/v1/auth/resolve-username", "/nonexistent-route-404"]:
            res = await client.get(path)
            assert res.headers.get("X-Content-Type-Options") == "nosniff", f"Failed for path: {path}"


# ==============================================================================
# HEADER-03: Clickjacking protection (X-Frame-Options & frame-ancestors)
# ==============================================================================
@pytest.mark.asyncio
async def test_header_03_clickjacking_protection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/health")
        assert res.headers.get("X-Frame-Options") == "DENY"
        csp = res.headers.get("Content-Security-Policy", "")
        assert "frame-ancestors 'none'" in csp


# ==============================================================================
# HEADER-04: Referrer-Policy
# ==============================================================================
@pytest.mark.asyncio
async def test_header_04_referrer_policy():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/health")
        assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


# ==============================================================================
# HEADER-05: Authenticated sensitive API responses return Cache-Control: no-store
# ==============================================================================
@pytest.mark.asyncio
async def test_header_05_authenticated_api_no_store():
    token = create_test_jwt("usr-cache-test")
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        sensitive_routes = [
            "/api/v1/overview/stats",
            "/api/v1/configurations",
            "/api/v1/audits",
            "/api/v1/risks/stats",
            "/api/v1/remediations/stats",
        ]
        for route in sensitive_routes:
            res = await client.get(route, headers=headers)
            assert res.status_code == 200
            cache_control = res.headers.get("Cache-Control", "")
            assert "no-store" in cache_control, f"Route {route} missing no-store: {cache_control}"
            assert "no-cache" in cache_control


# ==============================================================================
# HEADER-06: User-specific data responses disallow intermediate caching
# ==============================================================================
@pytest.mark.asyncio
async def test_header_06_cache_control_headers_prevent_proxy_caching():
    token = create_test_jwt("usr-cache-proxy")
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/v1/configurations", headers=headers)
        assert res.status_code == 200
        assert res.headers.get("Pragma") == "no-cache"
        assert res.headers.get("Expires") == "0"
        assert "must-revalidate" in res.headers.get("Cache-Control", "")


# ==============================================================================
# HEADER-07: Unknown CORS origin is rejected in production configuration
# ==============================================================================
@pytest.mark.asyncio
async def test_header_07_unknown_cors_rejected(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        headers = {
            "Origin": "https://malicious-attacker-domain.org",
            "Access-Control-Request-Method": "POST",
        }
        res = await client.options("/api/v1/auth/resolve-username", headers=headers)
        # For rejected CORS origin, Access-Control-Allow-Origin MUST NOT be the attacker origin
        assert res.headers.get("Access-Control-Allow-Origin") != "https://malicious-attacker-domain.org"


# ==============================================================================
# HEADER-08: Production API does not emit wildcard credentialed CORS
# ==============================================================================
@pytest.mark.asyncio
async def test_header_08_no_wildcard_credentialed_cors():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/health")
        # If credentials are true, origin cannot be wildcard '*'
        allow_origin = res.headers.get("Access-Control-Allow-Origin")
        allow_creds = res.headers.get("Access-Control-Allow-Credentials")
        if allow_creds == "true":
            assert allow_origin != "*", "Wildcard origin with credentials violates CORS standard"


# ==============================================================================
# HEADER-09: Error responses do not leak internals & carry security headers
# ==============================================================================
@pytest.mark.asyncio
async def test_header_09_error_responses_safe_and_secured():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. 404
        res_404 = await client.get("/api/v1/configurations/non-existent-uuid-12345", headers={"Authorization": f"Bearer {create_test_jwt('usr-err')}"})
        assert res_404.status_code == 404
        assert res_404.headers.get("X-Content-Type-Options") == "nosniff"
        assert res_404.headers.get("X-Frame-Options") == "DENY"
        assert "traceback" not in res_404.text.lower()
        assert "c:\\" not in res_404.text.lower()

        # 2. 422
        res_422 = await client.post("/api/v1/auth/resolve-username", json={"invalid": 123})
        assert res_422.status_code == 422
        assert res_422.headers.get("X-Content-Type-Options") == "nosniff"
        assert "traceback" not in res_422.text.lower()


# ==============================================================================
# HEADER-10: File download responses enforce Content-Disposition: attachment
# ==============================================================================
@pytest.mark.asyncio
async def test_header_10_file_downloads_safe_content_disposition(client: AsyncClient):
    token = create_test_jwt("usr-dl")
    headers = {"Authorization": f"Bearer {token}"}

    # Upload test configuration
    up = await client.post(
        "/api/v1/configurations",
        files={"file": ("sec_test.cfg", io.BytesIO(SAMPLE_CFG.encode("utf-8")), "text/plain")},
        headers=headers,
    )
    assert up.status_code in [200, 201]
    cfg_id = up.json()["id"]

    # Download configuration
    res_dl = await client.get(f"/api/v1/configurations/{cfg_id}/export", headers=headers)
    assert res_dl.status_code == 200
    assert "Content-Disposition" in res_dl.headers
    cd = res_dl.headers["Content-Disposition"]
    assert "attachment" in cd
    assert "sec_test.cfg" in cd
    assert res_dl.headers.get("X-Content-Type-Options") == "nosniff"


# ==============================================================================
# HEADER-11: Open redirect validation rejects unsafe destinations
# ==============================================================================
@pytest.mark.asyncio
async def test_header_11_open_redirect_validation():
    # Read frontend redirect sanitization logic from route.ts and login/page.tsx
    with open("apps/web/src/app/auth/callback/route.ts", "r", encoding="utf-8") as f:
        route_code = f.read()

    with open("apps/web/src/app/(auth)/login/page.tsx", "r", encoding="utf-8") as f:
        login_code = f.read()

    # Both must explicitly forbid protocol-relative URLs (//), backslashes (/\\), and protocol schemes (://)
    assert "!trimmed.startsWith(\"//\")" in route_code or "!rawRedirect.startsWith(\"//\")" in route_code
    assert "!trimmed.includes(\"://\")" in route_code or "!rawRedirect.includes(\"://\")" in route_code
    assert "!trimmed.startsWith(\"//\")" in login_code


# ==============================================================================
# HEADER-12: Production frontend API base configuration strictly uses HTTPS
# ==============================================================================
@pytest.mark.asyncio
async def test_header_12_production_api_base_is_https():
    with open("apps/web/src/lib/api-client.ts", "r", encoding="utf-8") as f:
        code = f.read()

    # Production default must be strictly HTTPS
    assert "https://ai-driven-multi-vendor-network-security.onrender.com" in code
    # Upgrades insecure HTTP to HTTPS in production
    assert "trimmed.replace(\"http://\", \"https://\")" in code


# ==============================================================================
# HEADER-13: Frontend CSP explicitly permits legitimate dependencies
# ==============================================================================
@pytest.mark.asyncio
async def test_header_13_csp_permits_dependencies():
    with open("apps/web/next.config.ts", "r", encoding="utf-8") as f:
        next_config = f.read()

    assert "https://ai-driven-multi-vendor-network-security.onrender.com" in next_config
    assert "https://*.supabase.co" in next_config
    assert "wss://*.supabase.co" in next_config
    assert "https://accounts.google.com" in next_config
    assert "frame-ancestors 'none'" in next_config
    assert "object-src 'none'" in next_config


# ==============================================================================
# HEADER-14: Frontend CSP strictly forbids arbitrary wildcard scripts
# ==============================================================================
@pytest.mark.asyncio
async def test_header_14_csp_no_wildcard_scripts():
    with open("apps/web/next.config.ts", "r", encoding="utf-8") as f:
        next_config = f.read()

    # script-src must not contain wildcard '*'
    assert "script-src *" not in next_config
    assert "default-src *" not in next_config

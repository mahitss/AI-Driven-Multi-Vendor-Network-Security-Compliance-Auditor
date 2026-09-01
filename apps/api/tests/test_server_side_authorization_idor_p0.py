"""
NetVigil Complete Server-Side Authorization, IDOR & BOLA Hardening Test Suite
SIH26155 — NTRO Network Security Compliance Auditor

Exhaustive verification of direct API attack vectors:
- TEST 1: User A creates audit A. User B requests audit A -> Denied (404).
- TEST 2: User A creates finding A. User B requests finding A / explanation -> Denied (404).
- TEST 3: User B attempts to modify / reanalyze User A's audit/config -> Denied (404).
- TEST 4: User B attempts to delete User A's configuration/audit -> Denied (404).
- TEST 5: User B attempts remediation on User A's finding -> Denied (404).
- TEST 6: User B attempts to download/export User A's configuration/audit/report -> Denied (404).
- TEST 7: User B manipulates user_id/account_id/tenant_id in request body -> Ignored/Bound to auth identity.
- TEST 8: User B manipulates object ID in URL/query -> Denied (404).
- TEST 9: User B requests dashboard statistics after User A has data -> Isolated to B only (empty/0).
- TEST 10: User B requests nested resource belonging to A -> Denied (404).
- TEST 11: Unauthenticated request to protected resource -> 401.
- TEST 12: User A can still access and modify their own resources -> Success (200/201).
- TEST 13: Property / Fuzz Testing with mismatched UUIDs and user tokens.
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


def create_mock_jwt(user_id: str, email: str) -> str:
    """Generate a signed HS256 JWT using settings.SECRET_KEY."""
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
        "app_metadata": {"provider": "email", "role": "auditor"},
        "user_metadata": {"full_name": f"User {user_id[-6:]}"},
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


@pytest.fixture(autouse=True)
def clean_auth_cache():
    clear_token_cache()
    yield
    clear_token_cache()


SAMPLE_CISCO_CONFIG = """!
version 15.2
service timestamps log datetime msec
no service password-encryption
hostname NTRO-SEC-GATEWAY-A
!
no aaa new-model
!
no ip ssh version 2
!
line vty 0 4
 transport input telnet
!
end
"""


@pytest.mark.asyncio
async def test_idor_audit_and_finding_isolation(db_session: AsyncSession):
    """
    TEST 1: User A creates audit A. User B requests audit A -> Denied.
    TEST 2: User A creates finding A. User B requests finding A / explanation -> Denied.
    """
    user_a_id = f"usr-a-{uuid.uuid4()}"
    user_b_id = f"usr-b-{uuid.uuid4()}"
    token_a = create_mock_jwt(user_a_id, f"{user_a_id}@ntro.gov.in")
    token_b = create_mock_jwt(user_b_id, f"{user_b_id}@external.net")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # User A uploads configuration & runs audit
        up_res = await client.post(
            "/api/v1/configurations",
            files={"file": ("gateway_a.cfg", io.BytesIO(SAMPLE_CISCO_CONFIG.encode("utf-8")), "text/plain")},
            headers=headers_a,
        )
        assert up_res.status_code == 201
        cfg_a_id = up_res.json()["id"]

        audit_res = await client.post(
            "/api/v1/audits",
            json={"configuration_id": cfg_a_id, "frameworks": ["CIS", "NIST"]},
            headers=headers_a,
        )
        assert audit_res.status_code == 201
        audit_a_id = audit_res.json()["audit_id"]

        # TEST 1: User B requests User A's audit
        get_audit_b = await client.get(f"/api/v1/audits/{audit_a_id}", headers=headers_b)
        assert get_audit_b.status_code == 404

        get_audit_sum_b = await client.get(f"/api/v1/audits/{audit_a_id}/summary", headers=headers_b)
        assert get_audit_sum_b.status_code == 404

        # TEST 2: User A gets findings, User B tries to access finding A
        findings_a_res = await client.get(f"/api/v1/audits/{audit_a_id}/findings", headers=headers_a)
        assert findings_a_res.status_code == 200
        findings_a = findings_a_res.json()
        assert len(findings_a) > 0
        finding_a_id = findings_a[0]["id"]

        # User B attempts to explain finding A via AI
        explain_b = await client.post(f"/api/v1/ai/findings/{finding_a_id}/explanation", headers=headers_b)
        assert explain_b.status_code == 404

        # User B attempts to chat about audit A
        chat_b = await client.post(
            f"/api/v1/ai/audits/{audit_a_id}/chat",
            json={"query": "What are the critical vulnerabilities?"},
            headers=headers_b,
        )
        assert chat_b.status_code == 404


@pytest.mark.asyncio
async def test_idor_modification_and_deletion_denied(db_session: AsyncSession):
    """
    TEST 3: User B attempts to modify / reanalyze User A's configuration -> Denied.
    TEST 4: User B attempts to delete User A's configuration -> Denied.
    """
    user_a_id = f"usr-a-{uuid.uuid4()}"
    user_b_id = f"usr-b-{uuid.uuid4()}"
    token_a = create_mock_jwt(user_a_id, f"{user_a_id}@ntro.gov.in")
    token_b = create_mock_jwt(user_b_id, f"{user_b_id}@external.net")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        up_res = await client.post(
            "/api/v1/configurations",
            files={"file": ("gateway_mod.cfg", io.BytesIO(SAMPLE_CISCO_CONFIG.encode("utf-8")), "text/plain")},
            headers=headers_a,
        )
        assert up_res.status_code == 201
        cfg_a_id = up_res.json()["id"]

        # TEST 3: User B attempts to reanalyze / modify A's configuration
        reanalyze_b = await client.post(
            f"/api/v1/analysis/{cfg_a_id}/reanalyze",
            json={"modified_content": "hostname HACKED\n"},
            headers=headers_b,
        )
        assert reanalyze_b.status_code == 404

        training_reanalyze_b = await client.post(
            f"/api/v1/training/reanalyze/{cfg_a_id}",
            headers=headers_b,
        )
        assert training_reanalyze_b.status_code == 404

        # TEST 4: User B attempts to delete A's configuration
        del_b = await client.delete(f"/api/v1/configurations/{cfg_a_id}", headers=headers_b)
        assert del_b.status_code == 404

        # TEST 12: User A can still read and delete their own configuration
        get_a = await client.get(f"/api/v1/configurations/{cfg_a_id}", headers=headers_a)
        assert get_a.status_code == 200

        del_a = await client.delete(f"/api/v1/configurations/{cfg_a_id}", headers=headers_a)
        assert del_a.status_code == 204


@pytest.mark.asyncio
async def test_idor_remediation_and_export_denied(db_session: AsyncSession):
    """
    TEST 5: User B attempts remediation review on User A's proposal -> Denied.
    TEST 6: User B attempts to download/export User A's configuration or audit -> Denied.
    """
    user_a_id = f"usr-a-{uuid.uuid4()}"
    user_b_id = f"usr-b-{uuid.uuid4()}"
    token_a = create_mock_jwt(user_a_id, f"{user_a_id}@ntro.gov.in")
    token_b = create_mock_jwt(user_b_id, f"{user_b_id}@external.net")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        up_res = await client.post(
            "/api/v1/configurations",
            files={"file": ("gateway_rem.cfg", io.BytesIO(SAMPLE_CISCO_CONFIG.encode("utf-8")), "text/plain")},
            headers=headers_a,
        )
        cfg_a_id = up_res.json()["id"]

        audit_res = await client.post(
            "/api/v1/audits",
            json={"configuration_id": cfg_a_id, "frameworks": ["CIS"]},
            headers=headers_a,
        )
        audit_a_id = audit_res.json()["audit_id"]

        # Fetch remediations for User A
        rems_res = await client.get(f"/api/v1/audits/{audit_a_id}/remediations", headers=headers_a)
        rems_a = rems_res.json()
        assert len(rems_a) > 0
        rem_a_id = rems_a[0]["id"]

        # TEST 5: User B attempts remediation review on A's proposal
        review_b = await client.post(
            f"/api/v1/remediations/{rem_a_id}/review",
            json={"status": "APPROVED", "reviewed_by": "Attacker"},
            headers=headers_b,
        )
        assert review_b.status_code == 404

        # TEST 6: User B attempts to download/export A's config, audit, and remediation script
        exp_cfg_b = await client.get(f"/api/v1/configurations/{cfg_a_id}/export", headers=headers_b)
        assert exp_cfg_b.status_code == 404

        exp_audit_b = await client.get(f"/api/v1/audits/{audit_a_id}/export?format=csv", headers=headers_b)
        assert exp_audit_b.status_code == 404

        exp_rem_b = await client.get(f"/api/v1/remediations/{rem_a_id}/export", headers=headers_b)
        assert exp_rem_b.status_code == 404


@pytest.mark.asyncio
async def test_idor_body_parameter_tampering(db_session: AsyncSession):
    """
    TEST 7: User B manipulates user_id/account_id/tenant_id in request body.
    Server MUST bind ownership exclusively to authenticated identity from token.
    """
    user_a_id = f"usr-a-{uuid.uuid4()}"
    user_b_id = f"usr-b-{uuid.uuid4()}"
    token_a = create_mock_jwt(user_a_id, f"{user_a_id}@ntro.gov.in")
    token_b = create_mock_jwt(user_b_id, f"{user_b_id}@external.net")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # User B uploads config with body tampering claiming user_id = user_a_id
        up_res = await client.post(
            "/api/v1/configurations",
            files={"file": ("tampered.cfg", io.BytesIO(SAMPLE_CISCO_CONFIG.encode("utf-8")), "text/plain")},
            data={"user_id": user_a_id, "tenant_id": user_a_id, "account_id": user_a_id},
            headers=headers_b,
        )
        assert up_res.status_code == 201
        cfg_b_id = up_res.json()["id"]

        # Verify User B can access this config
        get_b = await client.get(f"/api/v1/configurations/{cfg_b_id}", headers=headers_b)
        assert get_b.status_code == 200

        # Verify User A cannot access this config
        get_a = await client.get(f"/api/v1/configurations/{cfg_b_id}", headers=headers_a)
        assert get_a.status_code == 404


@pytest.mark.asyncio
async def test_idor_nested_resource_and_url_tampering(db_session: AsyncSession):
    """
    TEST 8: User B manipulates object ID in URL/query -> Denied.
    TEST 10: User B requests nested resource belonging to A -> Denied.
    """
    user_a_id = f"usr-a-{uuid.uuid4()}"
    user_b_id = f"usr-b-{uuid.uuid4()}"
    token_a = create_mock_jwt(user_a_id, f"{user_a_id}@ntro.gov.in")
    token_b = create_mock_jwt(user_b_id, f"{user_b_id}@external.net")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        up_res = await client.post(
            "/api/v1/configurations",
            files={"file": ("gateway_nested.cfg", io.BytesIO(SAMPLE_CISCO_CONFIG.encode("utf-8")), "text/plain")},
            headers=headers_a,
        )
        cfg_a_id = up_res.json()["id"]

        audit_res = await client.post(
            "/api/v1/audits",
            json={"configuration_id": cfg_a_id, "frameworks": ["CIS"]},
            headers=headers_a,
        )
        audit_a_id = audit_res.json()["audit_id"]

        # TEST 8 & 10: Nested endpoint attacks
        nested_endpoints = [
            f"/api/v1/audits/{audit_a_id}/findings",
            f"/api/v1/audits/{audit_a_id}/risks",
            f"/api/v1/audits/{audit_a_id}/risk-graph",
            f"/api/v1/audits/{audit_a_id}/remediations",
            f"/api/v1/devices/{cfg_a_id}",
            f"/api/v1/devices/{cfg_a_id}/timeline",
            f"/api/v1/analysis/{cfg_a_id}",
            f"/api/v1/analysis/{cfg_a_id}/findings",
            f"/api/v1/analysis/{cfg_a_id}/evidence",
            f"/api/v1/analysis/{cfg_a_id}/risk",
            f"/api/v1/analysis/{cfg_a_id}/configuration",
        ]

        for endpoint in nested_endpoints:
            res = await client.get(endpoint, headers=headers_b)
            assert res.status_code == 404, f"Endpoint {endpoint} failed IDOR protection: got {res.status_code}"


@pytest.mark.asyncio
async def test_idor_dashboard_aggregation_isolation(db_session: AsyncSession):
    """
    TEST 9: User B requests dashboard statistics after User A has populated data.
    EXPECTED: User B receives strictly 0 / empty state. Zero global leakage.
    """
    user_a_id = f"usr-a-{uuid.uuid4()}"
    user_b_id = f"usr-b-{uuid.uuid4()}"
    token_a = create_mock_jwt(user_a_id, f"{user_a_id}@ntro.gov.in")
    token_b = create_mock_jwt(user_b_id, f"{user_b_id}@external.net")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # User A creates data
        up_res = await client.post(
            "/api/v1/configurations",
            files={"file": ("gateway_stats.cfg", io.BytesIO(SAMPLE_CISCO_CONFIG.encode("utf-8")), "text/plain")},
            headers=headers_a,
        )
        cfg_a_id = up_res.json()["id"]
        await client.post(
            "/api/v1/audits",
            json={"configuration_id": cfg_a_id, "frameworks": ["CIS", "NIST"]},
            headers=headers_a,
        )

        # User A stats verify data is present
        stats_a = (await client.get("/api/v1/overview/stats", headers=headers_a)).json()
        assert stats_a["total_configurations"] >= 1
        assert stats_a["total_audits"] >= 1

        # User B stats MUST be completely clean/isolated
        stats_b = (await client.get("/api/v1/overview/stats", headers=headers_b)).json()
        assert stats_b["total_configurations"] == 0
        assert stats_b["total_devices"] == 0
        assert stats_b["total_audits"] == 0
        assert stats_b["total_findings"] == 0
        assert stats_b["compliance_score"] == 0.0

        # Latest audit for B MUST be null
        latest_b = (await client.get("/api/v1/audits/latest", headers=headers_b)).json()
        assert latest_b is None

        # Risk stats for B MUST be 0
        risk_stats_b = (await client.get("/api/v1/risks/stats", headers=headers_b)).json()
        assert risk_stats_b["total_risks"] == 0

        # Remediation stats for B MUST be 0
        rem_stats_b = (await client.get("/api/v1/remediations/stats", headers=headers_b)).json()
        assert rem_stats_b["total_proposals"] == 0


@pytest.mark.asyncio
async def test_idor_unauthenticated_request_rejected(monkeypatch):
    """
    TEST 11: Unauthenticated request to protected resources MUST fail with 401.
    """
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "mock-secret-key-for-test-32chars!!")
    monkeypatch.setattr(settings, "TRUST_FORWARDED_HEADERS", True)
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    fresh_ip = f"198.51.100.{uuid.uuid4().int % 250}"
    test_headers = {"X-Forwarded-For": fresh_ip}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        protected_endpoints = [
            ("GET", "/api/v1/configurations"),
            ("GET", "/api/v1/audits"),
            ("GET", "/api/v1/overview/stats"),
            ("GET", "/api/v1/overview/telemetry"),
            ("GET", "/api/v1/risks"),
            ("GET", "/api/v1/remediations"),
            ("GET", "/api/v1/reports"),
            ("GET", "/api/v1/agent/sessions"),
            ("POST", "/api/v1/agent/run"),
        ]

        for method, endpoint in protected_endpoints:
            if method == "GET":
                res = await client.get(endpoint, headers=test_headers)
            else:
                res = await client.post(endpoint, json={"objective": "harden devices"}, headers=test_headers)
            assert res.status_code == 401, f"Unauthenticated request to {endpoint} expected 401, got {res.status_code}"


@pytest.mark.asyncio
async def test_idor_property_fuzzing(db_session: AsyncSession):
    """
    TEST 13: Property / Fuzz Testing with random UUIDs and mismatched IDs.
    All arbitrary UUID requests from unauthorized caller must return 404.
    """
    user_b_id = f"usr-b-{uuid.uuid4()}"
    token_b = create_mock_jwt(user_b_id, f"{user_b_id}@external.net")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        for _ in range(5):
            fake_uuid = str(uuid.uuid4())
            res_cfg = await client.get(f"/api/v1/configurations/{fake_uuid}", headers=headers_b)
            assert res_cfg.status_code == 404

            res_audit = await client.get(f"/api/v1/audits/{fake_uuid}", headers=headers_b)
            assert res_audit.status_code == 404

            res_risk = await client.get(f"/api/v1/risks/{fake_uuid}", headers=headers_b)
            assert res_risk.status_code == 404

            res_rem = await client.get(f"/api/v1/remediations/{fake_uuid}", headers=headers_b)
            assert res_rem.status_code == 404

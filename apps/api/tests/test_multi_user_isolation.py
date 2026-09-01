"""
NetVigil Multi-User Data Isolation & IDOR Prevention Test Suite
Problem Statement: SIH26155 (NTRO)

Tests:
1. Unauthenticated / Invalid / Expired Token Rejection (401 Unauthorized)
2. Strict Multi-User Data Isolation across Configurations, Audits, Findings, Risks, Remediations, Reports, and Metrics
3. Direct IDOR (Insecure Direct Object Reference) Prevention on all endpoints (404/403)
4. Bidirectional Independence between User A and User B
"""
import time
import uuid
import jwt
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.finding import Finding
from app.models.remediation import RemediationProposal
from app.models.risk import RiskItem

TEST_SECRET = settings.SECRET_KEY


def create_test_jwt(user_id: str, email: str, expired: bool = False) -> str:
    """Generates a cryptographically signed test JWT for a given user ID."""
    now = time.time()
    exp = now - 3600 if expired else now + 3600
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "auditor",
        "iat": int(now),
        "exp": int(exp),
    }
    return jwt.encode(payload, TEST_SECRET, algorithm="HS256")


@pytest.mark.asyncio
async def test_invalid_token_rejected(client: AsyncClient):
    """Verifies that an invalid cryptographic token receives HTTP 401."""
    res = await client.get(
        "/api/v1/configurations",
        headers={"Authorization": "Bearer invalid.token.signature"},
    )
    assert res.status_code == 401
    assert "WWW-Authenticate" in res.headers


@pytest.mark.asyncio
async def test_expired_token_rejected(client: AsyncClient):
    """Verifies that an expired JWT token receives HTTP 401."""
    user_id = str(uuid.uuid4())
    expired_jwt = create_test_jwt(user_id=user_id, email="expired@netvigil.test", expired=True)
    res = await client.get(
        "/api/v1/configurations",
        headers={"Authorization": f"Bearer {expired_jwt}"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_multi_user_data_isolation_and_idor_protection(client: AsyncClient, db_session: AsyncSession):
    """
    Comprehensive multi-user isolation lifecycle test:
    1. User A (UUID A) uploads configuration & executes compliance audit.
    2. User B (UUID B) queries configurations, audits, findings, overview metrics.
       -> User B sees 0 records.
    3. User B attempts direct IDOR requests using User A's resource IDs.
       -> All return 404 (ResourceNotFoundError).
    4. User B uploads own configuration.
       -> User B sees only B's configuration.
       -> User A sees only A's configuration.
    """
    user_a_id = str(uuid.uuid4())
    user_b_id = str(uuid.uuid4())

    jwt_a = create_test_jwt(user_id=user_a_id, email="usera@enterprise.corp")
    jwt_b = create_test_jwt(user_id=user_b_id, email="userb@defense.gov")

    headers_a = {"Authorization": f"Bearer {jwt_a}"}
    headers_b = {"Authorization": f"Bearer {jwt_b}"}

    # ==========================================
    # STEP 1: USER A UPLOADS & AUDITS CONFIGURATION
    # ==========================================
    cisco_content = (
        "hostname CORE-ROUTER-A\n"
        "enable secret 5 $1$mERr$9cTjUIEqNGurQiFU.ZeCi1\n"
        "no service password-encryption\n"
        "line vty 0 4\n"
        " transport input telnet\n"
    )

    upload_res_a = await client.post(
        "/api/v1/configurations",
        headers=headers_a,
        files={"file": ("cisco-core-a.cfg", cisco_content.encode("utf-8"), "text/plain")},
    )
    assert upload_res_a.status_code == 201
    config_a_data = upload_res_a.json()
    config_a_id = config_a_data["id"]

    # User A executes compliance audit
    audit_res_a = await client.post(
        "/api/v1/audits",
        headers=headers_a,
        json={
            "configuration_id": config_a_id,
            "frameworks": ["CIS", "NIST"],
        },
    )
    assert audit_res_a.status_code == 201
    audit_a_data = audit_res_a.json()
    audit_a_id = audit_a_data["audit_id"]

    # Fetch User A findings
    findings_res_a = await client.get("/api/v1/audits/findings/all", headers=headers_a)
    assert findings_res_a.status_code == 200
    findings_a = findings_res_a.json()
    assert len(findings_a) > 0
    finding_a_id = findings_a[0]["id"]

    # ==========================================
    # STEP 2: USER B SEES ZERO OF USER A'S DATA
    # ==========================================
    # 2.1 Configurations
    configs_b = (await client.get("/api/v1/configurations", headers=headers_b)).json()
    assert len(configs_b) == 0

    # 2.2 Audits
    audits_b = (await client.get("/api/v1/audits", headers=headers_b)).json()
    assert len(audits_b) == 0

    # 2.3 Findings
    findings_b = (await client.get("/api/v1/audits/findings/all", headers=headers_b)).json()
    assert len(findings_b) == 0

    # 2.4 Latest Audit
    latest_b = (await client.get("/api/v1/audits/latest", headers=headers_b)).json()
    assert latest_b is None

    # 2.5 Overview Stats
    stats_b = (await client.get("/api/v1/overview/stats", headers=headers_b)).json()
    assert stats_b["total_configurations"] == 0
    assert stats_b["total_audits"] == 0
    assert stats_b["open_findings"] == 0
    assert stats_b["compliance_score"] == 0.0

    # 2.6 Devices
    devices_b = (await client.get("/api/v1/devices", headers=headers_b)).json()
    assert len(devices_b) == 0

    # 2.7 Risks
    risks_b = (await client.get("/api/v1/risks", headers=headers_b)).json()
    assert len(risks_b) == 0

    # 2.8 Remediations
    remediations_b = (await client.get("/api/v1/remediations", headers=headers_b)).json()
    assert len(remediations_b) == 0

    # 2.9 Comparable Pairs
    pairs_b = (await client.get("/api/v1/audits/comparable-pairs", headers=headers_b)).json()
    assert len(pairs_b) == 0

    # ==========================================
    # STEP 3: DIRECT IDOR ATTACK ATTEMPTS BY USER B
    # ==========================================
    # 3.1 Direct GET configuration A
    idor_config = await client.get(f"/api/v1/configurations/{config_a_id}", headers=headers_b)
    assert idor_config.status_code == 404

    # 3.2 Direct export configuration A
    idor_export = await client.get(f"/api/v1/configurations/{config_a_id}/export", headers=headers_b)
    assert idor_export.status_code == 404

    # 3.3 Direct GET audit A
    idor_audit = await client.get(f"/api/v1/audits/{audit_a_id}", headers=headers_b)
    assert idor_audit.status_code == 404

    # 3.4 Direct AI explanation for User A's finding
    idor_ai_explain = await client.post(f"/api/v1/ai/findings/{finding_a_id}/explanation", headers=headers_b)
    assert idor_ai_explain.status_code == 404

    # 3.5 Direct AI chat for User A's audit
    idor_ai_chat = await client.post(
        f"/api/v1/ai/audits/{audit_a_id}/chat",
        headers=headers_b,
        json={"query": "What are the failed controls?", "audit_id": audit_a_id},
    )
    assert idor_ai_chat.status_code == 404

    # 3.6 Direct AI Security Briefing for User A's audit
    idor_briefing = await client.get(f"/api/v1/ai/briefing/{audit_a_id}", headers=headers_b)
    assert idor_briefing.status_code == 404

    # ==========================================
    # STEP 4: USER B UPLOADS OWN CONFIGURATION
    # ==========================================
    fortinet_content = (
        "config system global\n"
        " set hostname PERIMETER-FW-B\n"
        " set admin-lockout-duration 300\n"
        "end\n"
    )

    upload_res_b = await client.post(
        "/api/v1/configurations",
        headers=headers_b,
        files={"file": ("fortinet-perimeter-b.conf", fortinet_content.encode("utf-8"), "text/plain")},
    )
    assert upload_res_b.status_code == 201
    config_b_data = upload_res_b.json()
    config_b_id = config_b_data["id"]

    # Verify User B sees exactly 1 configuration (Fortinet)
    configs_b_after = (await client.get("/api/v1/configurations", headers=headers_b)).json()
    assert len(configs_b_after) == 1
    assert configs_b_after[0]["id"] == config_b_id
    assert configs_b_after[0]["original_filename"] == "fortinet-perimeter-b.conf"

    # Verify User A still sees only 1 configuration (Cisco) and NOT User B's Fortinet config
    configs_a_after = (await client.get("/api/v1/configurations", headers=headers_a)).json()
    assert len(configs_a_after) == 1
    assert configs_a_after[0]["id"] == config_a_id
    assert configs_a_after[0]["original_filename"] == "cisco-core-a.cfg"

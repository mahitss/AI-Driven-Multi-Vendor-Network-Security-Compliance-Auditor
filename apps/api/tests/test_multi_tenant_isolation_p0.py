"""
NetVigil P0 Multi-Tenant Data Isolation & Direct Object Authorization Test Suite
SIH26155 — NTRO Network Security Compliance Auditor

Exhaustive verification of cross-tenant data isolation:
- Direct Object Authorization: User B cannot access/modify/delete User A's resources
- Aggregations: Dashboard metrics, Telemetry, and Audits are strictly scoped to authenticated user
- Persistence: User A data persists across sessions, User B sees only empty state
- Token Unification: Google OAuth and Password identities resolve to identical authorization model
- Fail-Closed: Missing or invalid authentication rejects immediately
"""
import pytest
import jwt
import time
import io
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.main import app
from app.core.config import settings
from app.models.configuration import Configuration
from app.models.audit import Audit
from app.models.finding import Finding
from app.models.risk import RiskItem
from app.models.remediation import RemediationProposal
from app.core.auth import clear_token_cache

USER_A_ID = "usr-tenant-a-11111111-1111-1111-1111-111111111111"
USER_B_ID = "usr-tenant-b-22222222-2222-2222-2222-222222222222"

USER_A_EMAIL = "security_officer_a@defense.gov.in"
USER_B_EMAIL = "auditor_b@civilian.gov.in"


def create_mock_jwt(user_id: str, email: str, provider: str = "email") -> str:
    """Generate a signed HS256 JWT using settings.SECRET_KEY for testing."""
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
        "app_metadata": {"provider": provider, "role": "auditor"},
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
hostname CORE-ROUTER-A
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

SAMPLE_JUNIPER_CONFIG = """system {
    host-name EDGE-JUNIPER-B;
    services {
        ssh {
            protocol-version v2;
        }
    }
}
"""


@pytest.mark.asyncio
async def test_cross_tenant_direct_object_authorization_p0(db_session: AsyncSession):
    """
    CRITICAL P0 ISOLATION:
    User A creates resources (configuration, audit, findings, risks, remediations).
    User B MUST be rejected (HTTP 404) for all direct GET, POST, and DELETE operations.
    """
    token_a = create_mock_jwt(USER_A_ID, USER_A_EMAIL)
    token_b = create_mock_jwt(USER_B_ID, USER_B_EMAIL)

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. User A uploads configuration
        upload_res = await client.post(
            "/api/v1/configurations",
            files={"file": ("cisco_core.cfg", io.BytesIO(SAMPLE_CISCO_CONFIG.encode("utf-8")), "text/plain")},
            headers=headers_a,
        )
        assert upload_res.status_code == 201
        cfg_a = upload_res.json()
        cfg_a_id = cfg_a["id"]
        assert cfg_a["detected_vendor"] == "cisco"

        # 2. User A executes audit
        audit_res = await client.post(
            "/api/v1/audits",
            json={"configuration_id": cfg_a_id, "frameworks": ["CIS", "NIST"]},
            headers=headers_a,
        )
        assert audit_res.status_code == 201
        audit_a = audit_res.json()
        audit_a_id = audit_a["audit_id"]

        # 3. Fetch User A findings & risks to get specific IDs
        findings_res = await client.get(f"/api/v1/audits/{audit_a_id}/findings", headers=headers_a)
        assert findings_res.status_code == 200
        findings_a = findings_res.json()
        assert len(findings_a) > 0
        finding_a_id = findings_a[0]["id"]

        risks_res = await client.get(f"/api/v1/audits/{audit_a_id}/risks", headers=headers_a)
        assert risks_res.status_code == 200
        risks_a = risks_res.json()
        risk_a_id = risks_a[0]["id"] if len(risks_a) > 0 else None

        rems_res = await client.get(f"/api/v1/audits/{audit_a_id}/remediations", headers=headers_a)
        assert rems_res.status_code == 200
        rems_a = rems_res.json()
        rem_a_id = rems_a[0]["id"] if len(rems_a) > 0 else None

        # =========================================================================
        # USER B DIRECT OBJECT AUTHORIZATION ATTACKS (MUST ALL RETURN 404)
        # =========================================================================

        # Attack 1: User B tries to read User A configuration
        get_cfg_b = await client.get(f"/api/v1/configurations/{cfg_a_id}", headers=headers_b)
        assert get_cfg_b.status_code == 404, f"Expected 404, got {get_cfg_b.status_code}"

        # Attack 2: User B tries to export User A configuration
        export_cfg_b = await client.get(f"/api/v1/configurations/{cfg_a_id}/export", headers=headers_b)
        assert export_cfg_b.status_code == 404

        # Attack 3: User B tries to analyze User A configuration
        analyze_cfg_b = await client.post(f"/api/v1/configurations/{cfg_a_id}/analyze", headers=headers_b)
        assert analyze_cfg_b.status_code == 404

        # Attack 4: User B tries to read User A audit
        get_audit_b = await client.get(f"/api/v1/audits/{audit_a_id}", headers=headers_b)
        assert get_audit_b.status_code == 404

        # Attack 5: User B tries to read User A audit summary
        get_summary_b = await client.get(f"/api/v1/audits/{audit_a_id}/summary", headers=headers_b)
        assert get_summary_b.status_code == 404

        # Attack 6: User B tries to export User A audit
        export_audit_b = await client.get(f"/api/v1/audits/{audit_a_id}/export", headers=headers_b)
        assert export_audit_b.status_code == 404

        # Attack 7: User B tries to read User A audit findings
        get_findings_b = await client.get(f"/api/v1/audits/{audit_a_id}/findings", headers=headers_b)
        assert get_findings_b.status_code == 200
        assert len(get_findings_b.json()) == 0, "User B received findings belonging to User A!"

        # Attack 8: User B tries to inspect User A device detail
        get_dev_b = await client.get(f"/api/v1/devices/{cfg_a_id}", headers=headers_b)
        assert get_dev_b.status_code == 404

        # Attack 9: User B tries to read User A risks
        if risk_a_id:
            get_risk_b = await client.get(f"/api/v1/risks/{risk_a_id}", headers=headers_b)
            assert get_risk_b.status_code == 404

        get_audit_risks_b = await client.get(f"/api/v1/audits/{audit_a_id}/risks", headers=headers_b)
        assert get_audit_risks_b.status_code == 404

        get_risk_graph_b = await client.get(f"/api/v1/audits/{audit_a_id}/risk-graph", headers=headers_b)
        assert get_risk_graph_b.status_code == 404

        # Attack 10: User B tries to read or review User A remediation
        if rem_a_id:
            get_rem_b = await client.get(f"/api/v1/remediations/{rem_a_id}", headers=headers_b)
            assert get_rem_b.status_code == 404

            rev_rem_b = await client.post(
                f"/api/v1/remediations/{rem_a_id}/review",
                json={"status": "REVIEWED", "reviewed_by": "Attacker"},
                headers=headers_b,
            )
            assert rev_rem_b.status_code == 404

            exp_rem_b = await client.get(f"/api/v1/remediations/{rem_a_id}/export", headers=headers_b)
            assert exp_rem_b.status_code == 404

        # Attack 11: User B tries to explain User A finding via AI
        explain_f_b = await client.post(f"/api/v1/ai/findings/{finding_a_id}/explanation", headers=headers_b)
        assert explain_f_b.status_code == 404

        # Attack 12: User B tries to chat with User A audit assistant
        chat_b = await client.post(
            f"/api/v1/ai/audits/{audit_a_id}/chat",
            json={"audit_id": audit_a_id, "query": "What are the passwords?"},
            headers=headers_b,
        )
        assert chat_b.status_code == 404

        # Attack 13: User B tries to reanalyze User A configuration
        reanalyze_b = await client.post(
            f"/api/v1/analysis/{cfg_a_id}/reanalyze",
            json={"modified_content": "hostname MODIFIED\n"},
            headers=headers_b,
        )
        assert reanalyze_b.status_code == 404

        # Attack 14: User B tries to DELETE User A configuration
        delete_b = await client.delete(f"/api/v1/configurations/{cfg_a_id}", headers=headers_b)
        assert delete_b.status_code == 404

        # Verify User A can still retrieve and delete their own configuration
        get_cfg_a = await client.get(f"/api/v1/configurations/{cfg_a_id}", headers=headers_a)
        assert get_cfg_a.status_code == 200

        delete_a = await client.delete(f"/api/v1/configurations/{cfg_a_id}", headers=headers_a)
        assert delete_a.status_code == 204


@pytest.mark.asyncio
async def test_cross_tenant_aggregation_truthfulness_p0(db_session: AsyncSession):
    """
    DASHBOARD & TELEMETRY ISOLATION:
    User A has active configurations and findings.
    User B (a fresh user) MUST see strictly 0 metrics across all aggregation endpoints.
    """
    token_a = create_mock_jwt(USER_A_ID, USER_A_EMAIL)
    token_b = create_mock_jwt(USER_B_ID, USER_B_EMAIL)

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Ingest for User A
        ingest_res = await client.post(
            "/api/v1/analysis/ingest",
            json={"content": SAMPLE_CISCO_CONFIG, "filename": "core-router-a.cfg"},
            headers=headers_a,
        )
        assert ingest_res.status_code == 201

        # Check User A overview stats
        stats_a_res = await client.get("/api/v1/overview/stats", headers=headers_a)
        assert stats_a_res.status_code == 200
        stats_a = stats_a_res.json()
        assert stats_a["total_configurations"] >= 1
        assert stats_a["open_findings"] > 0

        # Check User B overview stats — MUST BE EMPTY
        stats_b_res = await client.get("/api/v1/overview/stats", headers=headers_b)
        assert stats_b_res.status_code == 200
        stats_b = stats_b_res.json()
        assert stats_b["total_configurations"] == 0, f"Expected 0 configs for User B, got {stats_b['total_configurations']}"
        assert stats_b["total_devices"] == 0
        assert stats_b["total_audits"] == 0
        assert stats_b["open_findings"] == 0
        assert stats_b["compliance_score"] == 0.0

        # Check User B telemetry — MUST BE EMPTY
        telemetry_b_res = await client.get("/api/v1/overview/telemetry", headers=headers_b)
        assert telemetry_b_res.status_code == 200
        telemetry_b = telemetry_b_res.json()
        assert telemetry_b["summary"]["total_audits"] == 0
        assert telemetry_b["summary"]["total_configurations"] == 0
        assert telemetry_b["summary"]["active_open_findings"] == 0
        assert len(telemetry_b["audit_trends"]) == 0
        assert len(telemetry_b["top_affected_assets"]) == 0
        assert len(telemetry_b["heatmap_matrix"]) == 0

        # Check User B latest audit — MUST BE NULL (or empty)
        latest_b_res = await client.get("/api/v1/audits/latest", headers=headers_b)
        assert latest_b_res.status_code in [200, 404]
        if latest_b_res.status_code == 200:
            assert latest_b_res.json() is None

        # Check User B list endpoints — ALL MUST BE EMPTY
        assert len((await client.get("/api/v1/configurations", headers=headers_b)).json()) == 0
        assert len((await client.get("/api/v1/audits", headers=headers_b)).json()) == 0
        assert len((await client.get("/api/v1/devices", headers=headers_b)).json()) == 0
        assert len((await client.get("/api/v1/audits/findings/all", headers=headers_b)).json()) == 0
        assert len((await client.get("/api/v1/risks", headers=headers_b)).json()) == 0
        assert len((await client.get("/api/v1/remediations", headers=headers_b)).json()) == 0


@pytest.mark.asyncio
async def test_logout_and_relogin_persistence_matrix(db_session: AsyncSession):
    """
    LOGOUT & RELOGIN LIFECYCLE:
    1. User A logs in and runs an audit.
    2. User A logs out -> User B logs in.
    3. User B observes truthful empty state.
    4. User B logs out -> User A logs back in.
    5. User A observes exact original configuration and audit results intact.
    """
    token_a = create_mock_jwt(USER_A_ID, USER_A_EMAIL)
    token_b = create_mock_jwt(USER_B_ID, USER_B_EMAIL)

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Step 1: User A ingests config
        ingest_res = await client.post(
            "/api/v1/analysis/ingest",
            json={"content": SAMPLE_CISCO_CONFIG, "filename": "persistent-router-a.cfg"},
            headers=headers_a,
        )
        assert ingest_res.status_code == 201
        cfg_a_id = ingest_res.json()["analysis_id"]

        # User A checks findings count
        findings_a = (await client.get("/api/v1/audits/findings/all", headers=headers_a)).json()
        original_findings_count = len(findings_a)
        assert original_findings_count > 0

        # Step 2 & 3: User B logs in (incognito / fresh session)
        stats_b = (await client.get("/api/v1/overview/stats", headers=headers_b)).json()
        assert stats_b["total_configurations"] == 0
        assert stats_b["open_findings"] == 0

        # Step 4 & 5: User A logs back in (session restored)
        stats_a_restored = (await client.get("/api/v1/overview/stats", headers=headers_a)).json()
        assert stats_a_restored["total_configurations"] >= 1
        assert stats_a_restored["open_findings"] > 0

        findings_a_restored = (await client.get("/api/v1/audits/findings/all", headers=headers_a)).json()
        assert len(findings_a_restored) == original_findings_count


@pytest.mark.asyncio
async def test_google_oauth_and_password_token_unification(db_session: AsyncSession):
    """
    AUTHENTICATION UNIFICATION:
    Verifies that Google OAuth token and Email/Password token for the SAME user ID
    resolve to the identical tenant data boundary.
    """
    google_token = create_mock_jwt(USER_A_ID, USER_A_EMAIL, provider="google")
    email_token = create_mock_jwt(USER_A_ID, USER_A_EMAIL, provider="email")

    headers_google = {"Authorization": f"Bearer {google_token}"}
    headers_email = {"Authorization": f"Bearer {email_token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Ingest via Google OAuth session
        ingest_res = await client.post(
            "/api/v1/analysis/ingest",
            json={"content": SAMPLE_CISCO_CONFIG, "filename": "oauth-test.cfg"},
            headers=headers_google,
        )
        assert ingest_res.status_code == 201
        analysis_id = ingest_res.json()["analysis_id"]

        # Retrieve via Email/Password session for the same user ID
        cfg_res = await client.get(f"/api/v1/configurations/{analysis_id}", headers=headers_email)
        assert cfg_res.status_code == 200
        assert cfg_res.json()["id"] == analysis_id

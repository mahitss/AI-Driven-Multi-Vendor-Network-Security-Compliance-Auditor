"""
Test Suite: Strict Multi-User Tenant Data Isolation
Problem Statement: SIH26155 (NTRO)
Verifies that all application state (Configurations, Audits, Findings, Risks,
Remediations, Telemetry, Reports, Devices, Analysis) is isolated strictly to the
authenticated Supabase identity, preventing cross-user data leakage and horizontal privilege escalation.
"""
import time
import jwt
import pytest
from httpx import AsyncClient
from app.core.config import settings


def make_user_token(user_id: str, email: str) -> str:
    """Generates a valid test JWT signed with settings.SECRET_KEY for a specific user ID."""
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "exp": time.time() + 3600,
        "iat": time.time(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


SAMPLE_CISCO_CONFIG = """!
hostname RTR-BORDER-01
no service password-encryption
enable secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0
!
line vty 0 4
 transport input telnet
 password insecurepass
 login
!
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
!
snmp-server community public RO
!
end
"""


@pytest.mark.asyncio
async def test_multi_user_data_isolation_flow(client: AsyncClient):
    """
    Complete isolation lifecycle:
    1. User A (user_a_uuid) ingests a configuration and runs an audit.
    2. User A's posture stats, telemetry, findings, and risks are fully populated.
    3. User B (user_b_uuid) authenticates and sees a clean zero-state.
    4. User B cannot access User A's configuration or audit by ID (returns 404).
    """
    user_a_id = "usr_tenant_alpha_1111"
    user_b_id = "usr_tenant_bravo_2222"

    token_a = make_user_token(user_a_id, "user_a@ntro.gov.in")
    token_b = make_user_token(user_b_id, "user_b@ntro.gov.in")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. User A uploads a configuration
    upload_res = await client.post(
        "/api/v1/configurations",
        files={"file": ("rtr_border_alpha.cfg", SAMPLE_CISCO_CONFIG.encode("utf-8"), "text/plain")},
        headers=headers_a,
    )
    assert upload_res.status_code == 201, upload_res.text
    config_a = upload_res.json()
    config_a_id = config_a["id"]

    # 2. User A runs an audit
    audit_res = await client.post(
        "/api/v1/audits",
        json={"configuration_id": config_a_id, "frameworks": ["CIS", "NIST"]},
        headers=headers_a,
    )
    assert audit_res.status_code == 201, audit_res.text
    audit_a = audit_res.json()
    audit_a_id = audit_a["audit_id"]

    # 3. User A checks /overview/stats -> has data
    stats_a_res = await client.get("/api/v1/overview/stats", headers=headers_a)
    assert stats_a_res.status_code == 200
    stats_a = stats_a_res.json()
    assert stats_a["total_configurations"] == 1
    assert stats_a["total_audits"] == 1
    assert stats_a["total_findings"] > 0
    assert stats_a["open_findings"] > 0

    # 4. User A checks /overview/telemetry -> has data points
    telemetry_a_res = await client.get("/api/v1/overview/telemetry", headers=headers_a)
    assert telemetry_a_res.status_code == 200
    telemetry_a = telemetry_a_res.json()
    assert len(telemetry_a["audit_trends"]) >= 1
    assert len(telemetry_a["top_affected_assets"]) >= 1
    assert len(telemetry_a["heatmap_matrix"]) >= 1
    assert len(telemetry_a["topology"]["nodes"]) >= 1

    # 5. User B checks /overview/stats -> MUST BE COMPLETELY EMPTY (Zero data leakage)
    stats_b_res = await client.get("/api/v1/overview/stats", headers=headers_b)
    assert stats_b_res.status_code == 200
    stats_b = stats_b_res.json()
    assert stats_b["total_configurations"] == 0
    assert stats_b["total_devices"] == 0
    assert stats_b["total_audits"] == 0
    assert stats_b["total_findings"] == 0
    assert stats_b["open_findings"] == 0
    assert stats_b["compliance_score"] == 0.0
    assert stats_b["risk_score"] == 0.0

    # 6. User B checks /overview/telemetry -> MUST BE EMPTY
    telemetry_b_res = await client.get("/api/v1/overview/telemetry", headers=headers_b)
    assert telemetry_b_res.status_code == 200
    telemetry_b = telemetry_b_res.json()
    assert len(telemetry_b["audit_trends"]) == 0
    assert len(telemetry_b["top_affected_assets"]) == 0
    assert len(telemetry_b["heatmap_matrix"]) == 0
    assert len(telemetry_b["topology"]["nodes"]) == 0

    # 7. User B queries list endpoints -> empty lists
    configs_b_res = await client.get("/api/v1/configurations", headers=headers_b)
    assert configs_b_res.status_code == 200
    assert len(configs_b_res.json()) == 0

    audits_b_res = await client.get("/api/v1/audits", headers=headers_b)
    assert audits_b_res.status_code == 200
    assert len(audits_b_res.json()) == 0

    findings_b_res = await client.get("/api/v1/audits/findings/all", headers=headers_b)
    assert findings_b_res.status_code == 200
    assert len(findings_b_res.json()) == 0

    risks_b_res = await client.get("/api/v1/risks", headers=headers_b)
    assert risks_b_res.status_code == 200
    assert len(risks_b_res.json()) == 0

    devices_b_res = await client.get("/api/v1/devices", headers=headers_b)
    assert devices_b_res.status_code == 200
    assert len(devices_b_res.json()) == 0

    # 8. User B attempts direct object reference attacks against User A's resources -> 404 Not Found
    get_cfg_res = await client.get(f"/api/v1/configurations/{config_a_id}", headers=headers_b)
    assert get_cfg_res.status_code == 404

    export_cfg_res = await client.get(f"/api/v1/configurations/{config_a_id}/export", headers=headers_b)
    assert export_cfg_res.status_code == 404

    analyze_cfg_res = await client.post(f"/api/v1/configurations/{config_a_id}/analyze", headers=headers_b)
    assert analyze_cfg_res.status_code == 404

    get_audit_res = await client.get(f"/api/v1/audits/{audit_a_id}", headers=headers_b)
    assert get_audit_res.status_code == 404

    export_audit_res = await client.get(f"/api/v1/audits/{audit_a_id}/export", headers=headers_b)
    assert export_audit_res.status_code == 404

    get_audit_findings_res = await client.get(f"/api/v1/audits/{audit_a_id}/findings", headers=headers_b)
    assert get_audit_findings_res.status_code == 200
    assert len(get_audit_findings_res.json()) == 0

    get_audit_risks_res = await client.get(f"/api/v1/audits/{audit_a_id}/risks", headers=headers_b)
    assert get_audit_risks_res.status_code == 404

    get_audit_risk_graph_res = await client.get(f"/api/v1/audits/{audit_a_id}/risk-graph", headers=headers_b)
    assert get_audit_risk_graph_res.status_code == 404

    get_device_res = await client.get(f"/api/v1/devices/{config_a_id}", headers=headers_b)
    assert get_device_res.status_code == 404


@pytest.mark.asyncio
async def test_duplicate_configuration_by_different_users(client: AsyncClient):
    """
    Verifies that User A and User B can upload the exact same configuration content
    without unique hash collisions, and each user only sees their own copy.
    """
    user_a_id = "usr_alpha_999"
    user_b_id = "usr_bravo_888"

    token_a = make_user_token(user_a_id, "alpha@ntro.gov.in")
    token_b = make_user_token(user_b_id, "bravo@ntro.gov.in")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A uploads
    res_a = await client.post(
        "/api/v1/configurations",
        files={"file": ("shared_core_router.cfg", SAMPLE_CISCO_CONFIG.encode("utf-8"), "text/plain")},
        headers=headers_a,
    )
    assert res_a.status_code == 201
    cfg_a_id = res_a.json()["id"]

    # User B uploads exact same file
    res_b = await client.post(
        "/api/v1/configurations",
        files={"file": ("shared_core_router.cfg", SAMPLE_CISCO_CONFIG.encode("utf-8"), "text/plain")},
        headers=headers_b,
    )
    assert res_b.status_code == 201
    cfg_b_id = res_b.json()["id"]

    # They should have distinct IDs and be isolated
    assert cfg_a_id != cfg_b_id

    # User A list
    list_a = (await client.get("/api/v1/configurations", headers=headers_a)).json()
    assert len(list_a) == 1
    assert list_a[0]["id"] == cfg_a_id

    # User B list
    list_b = (await client.get("/api/v1/configurations", headers=headers_b)).json()
    assert len(list_b) == 1
    assert list_b[0]["id"] == cfg_b_id


@pytest.mark.asyncio
async def test_global_search_tenant_isolation(client: AsyncClient):
    """
    Verifies that the unified search endpoint (/api/v1/overview/search) does not leak
    filenames, audit IDs, or findings across tenants.
    """
    user_a_id = "usr_search_alpha"
    user_b_id = "usr_search_bravo"

    token_a = make_user_token(user_a_id, "user_a@ntro.gov.in")
    token_b = make_user_token(user_b_id, "user_b@ntro.gov.in")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    secret_filename = "TOP_SECRET_BORDER_GW_ALPHA.cfg"
    upload_res = await client.post(
        "/api/v1/configurations",
        files={"file": (secret_filename, SAMPLE_CISCO_CONFIG.encode("utf-8"), "text/plain")},
        headers=headers_a,
    )
    assert upload_res.status_code == 201

    # User A searches for the secret keyword
    search_a = await client.get("/api/v1/overview/search?q=TOP_SECRET", headers=headers_a)
    assert search_a.status_code == 200
    res_a = search_a.json()
    assert any(c["title"] == secret_filename for c in res_a["categories"]["configurations"])

    # User B searches for the secret keyword -> MUST NOT FIND User A's config
    search_b = await client.get("/api/v1/overview/search?q=TOP_SECRET", headers=headers_b)
    assert search_b.status_code == 200
    res_b = search_b.json()
    assert len(res_b["categories"]["configurations"]) == 0
    assert len(res_b["categories"]["audits"]) == 0

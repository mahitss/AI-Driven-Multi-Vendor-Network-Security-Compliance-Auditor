"""
Integration Tests for User Audit Data Persistence Across Relogin Sessions
Problem Statement: SIH26155 (NTRO)

Tests:
1. User A logs in, ingests Cisco configuration, and executes audit.
2. User A retrieves latest audit execution via GET /api/v1/audits/latest and stats via GET /api/v1/overview/stats.
3. User B logs in with a different identity:
   - Verifies dashboard and latest audit return clean empty state (0 audits, 0 configs).
   - Verifies User A's data is completely invisible.
4. User B ingests Juniper configuration and audits it.
5. User A logs back in with User A's credentials:
   - Verifies User A's original audit execution, SHA-256, findings, compliance score, and risk score are 100% restored.
   - Verifies User B's configuration is not visible to User A.
"""
import pytest
from httpx import AsyncClient, ASGITransport
import jwt
from datetime import datetime, timezone, timedelta

from app.main import app
from app.core.config import settings

CISCO_TEST_CONFIG = """
hostname Edge-Router-01
!
service password-encryption
!
enable secret 5 $1$mERr$9cTjUIEqNGurQiFU.ZeCi1
!
username admin privilege 15 secret 5 $1$mERr$9cTjUIEqNGurQiFU.ZeCi1
!
ip domain-name netvigil.enterprise.mil
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3
!
no ip http server
no ip http secure-server
!
interface GigabitEthernet0/0
 description WAN-Uplink
 ip address 198.51.100.1 255.255.255.0
 no shutdown
!
line vty 0 4
 transport input ssh
 login local
 exec-timeout 10 0
!
end
"""

JUNIPER_TEST_CONFIG = """
system {
    host-name branch-gw-01;
    services {
        ssh {
            protocol-version v2;
        }
    }
}
interfaces {
    ge-0/0/0 {
        unit 0 {
            family inet {
                address 203.0.113.1/24;
            }
        }
    }
}
"""


def _create_test_jwt(user_id: str, email: str) -> str:
    """Generate a test JWT matching the backend's verification requirements."""
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "app_metadata": {"provider": "google"},
        "user_metadata": {"full_name": email.split("@")[0]},
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=2)).timestamp()),
    }
    key = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY or "netvigil-secure-test-jwt-secret-key-32b"
    return jwt.encode(payload, key, algorithm="HS256")


@pytest.mark.asyncio
async def test_audit_persistence_across_relogin_lifecycle():
    import uuid
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: User A Session Setup (fresh unique ID)
        user_a_id = f"usr_alpha_{uuid.uuid4().hex[:8]}"
        token_a = _create_test_jwt(user_a_id, "usera@enterprise.mil")
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # User A Ingests and Audits Cisco Configuration
        ingest_res_a = await client.post(
            "/api/v1/analysis/ingest",
            json={
                "content": CISCO_TEST_CONFIG,
                "filename": "cisco-edge-01.cfg",
                "vendor_hint": "cisco",
            },
            headers=headers_a,
        )
        assert ingest_res_a.status_code == 201, f"Ingest failed: {ingest_res_a.text}"
        data_a = ingest_res_a.json()
        analysis_id_a = data_a["analysis_id"]
        sha256_a = data_a["file_hash"]

        # User A checks Latest Audit Endpoint
        latest_res_a = await client.get("/api/v1/audits/latest", headers=headers_a)
        assert latest_res_a.status_code == 200
        latest_data_a = latest_res_a.json()
        assert latest_data_a is not None
        assert latest_data_a["configuration_id"] == analysis_id_a
        assert latest_data_a["sha256"] == sha256_a
        assert latest_data_a["filename"] == "cisco-edge-01.cfg"
        assert latest_data_a["total_configurations"] >= 1
        audit_id_a = latest_data_a["audit_id"]

        # User A checks Overview Stats
        stats_res_a = await client.get("/api/v1/overview/stats", headers=headers_a)
        assert stats_res_a.status_code == 200
        stats_data_a = stats_res_a.json()
        assert stats_data_a["total_configurations"] >= 1
        assert stats_data_a["total_audits"] >= 1
        score_a = stats_data_a["compliance_score"]
        risk_a = stats_data_a["risk_score"]

        # -------------------------------------------------------------
        # Step 2: User B Session Setup (Fresh unique user simulating separate tenant)
        # -------------------------------------------------------------
        user_b_id = f"usr_bravo_{uuid.uuid4().hex[:8]}"
        token_b = _create_test_jwt(user_b_id, "userb@enterprise.mil")
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User B should see NO latest audits (Empty State)
        latest_res_b = await client.get("/api/v1/audits/latest", headers=headers_b)
        assert latest_res_b.status_code == 200
        assert latest_res_b.json() is None

        # User B should see 0 configurations in overview stats
        stats_res_b = await client.get("/api/v1/overview/stats", headers=headers_b)
        assert stats_res_b.status_code == 200
        stats_data_b = stats_res_b.json()
        assert stats_data_b["total_configurations"] == 0
        assert stats_data_b["total_audits"] == 0
        assert stats_data_b["open_findings"] == 0

        # User B Ingests and Audits Juniper Configuration
        ingest_res_b = await client.post(
            "/api/v1/analysis/ingest",
            json={
                "content": JUNIPER_TEST_CONFIG,
                "filename": "juniper-gw-01.conf",
                "vendor_hint": "juniper",
            },
            headers=headers_b,
        )
        assert ingest_res_b.status_code == 201
        data_b = ingest_res_b.json()
        analysis_id_b = data_b["analysis_id"]
        sha256_b = data_b["file_hash"]

        # User B checks Latest Audit
        latest_b_updated = await client.get("/api/v1/audits/latest", headers=headers_b)
        assert latest_b_updated.status_code == 200
        latest_data_b = latest_b_updated.json()
        assert latest_data_b is not None
        assert latest_data_b["configuration_id"] == analysis_id_b
        assert latest_data_b["sha256"] == sha256_b
        assert latest_data_b["filename"] == "juniper-gw-01.conf"

        # -------------------------------------------------------------
        # Step 3: User A Logs Back In (Simulating Relogin as User A)
        # -------------------------------------------------------------
        # User A's latest audit MUST be restored with exact same audit ID and SHA-256
        relogin_latest_a = await client.get("/api/v1/audits/latest", headers=headers_a)
        assert relogin_latest_a.status_code == 200
        relogin_data_a = relogin_latest_a.json()
        assert relogin_data_a is not None
        assert relogin_data_a["audit_id"] == audit_id_a
        assert relogin_data_a["configuration_id"] == analysis_id_a
        assert relogin_data_a["sha256"] == sha256_a
        assert relogin_data_a["filename"] == "cisco-edge-01.cfg"

        # User A's overview stats MUST be restored
        relogin_stats_a = await client.get("/api/v1/overview/stats", headers=headers_a)
        assert relogin_stats_a.status_code == 200
        relogin_stats_data_a = relogin_stats_a.json()
        assert relogin_stats_data_a["total_configurations"] == stats_data_a["total_configurations"]
        assert relogin_stats_data_a["compliance_score"] == score_a
        assert relogin_stats_data_a["risk_score"] == risk_a

        # User A's configurations list should contain User A's config and NOT User B's config
        configs_res_a = await client.get("/api/v1/configurations", headers=headers_a)
        assert configs_res_a.status_code == 200
        configs_a = configs_res_a.json()
        config_ids_a = [c["id"] for c in configs_a]
        assert analysis_id_a in config_ids_a
        assert analysis_id_b not in config_ids_a

"""
Integration Tests for Deterministic Multi-Vendor Audit Divergence and Real Data Integrity
Problem Statement: SIH26155 (NTRO)
"""
import pytest
from httpx import AsyncClient, ASGITransport
import jwt
from datetime import datetime, timezone, timedelta

from app.main import app
from app.core.config import settings

INSECURE_CISCO_CONFIG = """
hostname Core-Router-Insecure
!
no service password-encryption
!
enable password cisco
!
ip domain-name test.local
ip ssh version 1
!
ip http server
!
line vty 0 4
 transport input telnet
 password cisco
!
end
"""

HARDENED_CISCO_CONFIG = """
hostname Core-Router-Hardened
!
service password-encryption
service timestamps debug datetime msec
service timestamps log datetime msec
service tcp-keepalives-in
service tcp-keepalives-out
!
enable secret 9 $9$mERr$9cTjUIEqNGurQiFU.ZeCi1
!
username secadmin privilege 15 secret 9 $9$mERr$9cTjUIEqNGurQiFU.ZeCi1
!
aaa new-model
aaa authentication login default local
aaa authorization exec default local
!
ip domain-name secure.defense.gov
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3
!
no ip http server
no ip http secure-server
no ip source-route
!
logging buffered 64000
logging trap warnings
!
banner motd ^C
AUTHORIZED ACCESS ONLY - ALL ACTIVITY MONITORED AND LOGGED
^C
!
interface GigabitEthernet0/0
 description WAN-Uplink
 ip address 198.51.100.1 255.255.255.0
 no shutdown
!
line con 0
 exec-timeout 5 0
 transport output none
!
line vty 0 4
 transport input ssh
 login local
 exec-timeout 10 0
 access-class 10 in
!
access-list 10 permit 10.0.0.0 0.255.255.255
!
end
"""

INSECURE_FORTINET_CONFIG = """
config system global
    set hostname "FortiGate-Insecure"
    set admin-sport 80
    set admin-ssh-port 22
    set admin-ssh-v1 enable
    set admintimeout 480
end
config system interface
    edit "port1"
        set mode static
        set ip 192.168.1.1 255.255.255.0
        set allowaccess ping https ssh http telnet
    next
end
"""


def create_mock_jwt(user_id: str, email: str) -> str:
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
async def test_multi_vendor_audit_divergence_and_reports():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user_id = "test-divergence-user-001"
        token = create_mock_jwt(user_id, "auditor@soc.gov.in")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Ingest Insecure Cisco Config
        ingest_insecure = await client.post(
            "/api/v1/analysis/ingest",
            headers=headers,
            json={
                "content": INSECURE_CISCO_CONFIG,
                "filename": "insecure-router.cfg",
                "vendor_hint": "cisco",
            },
        )
        assert ingest_insecure.status_code == 201
        insecure_cfg_id = ingest_insecure.json()["analysis_id"]

        # 2. Insecure Cisco Audit Details from latest audit
        latest_insecure_res = await client.get("/api/v1/audits/latest", headers=headers)
        assert latest_insecure_res.status_code == 200
        insecure_data = latest_insecure_res.json()
        insecure_audit_id = insecure_data["audit_id"]
        insecure_score = insecure_data["compliance_score"]
        insecure_failed = insecure_data["open_findings"]

        # Insecure cisco should have low compliance score (< 50%)
        assert insecure_score < 50.0
        assert insecure_failed > 0

        # 3. Ingest Hardened Cisco Config
        ingest_hardened = await client.post(
            "/api/v1/analysis/ingest",
            headers=headers,
            json={
                "content": HARDENED_CISCO_CONFIG,
                "filename": "hardened-router.cfg",
                "vendor_hint": "cisco",
            },
        )
        assert ingest_hardened.status_code == 201
        hardened_cfg_id = ingest_hardened.json()["analysis_id"]

        # 4. Hardened Cisco Audit Details
        latest_hardened_res = await client.get("/api/v1/audits/latest", headers=headers)
        assert latest_hardened_res.status_code == 200
        hardened_data = latest_hardened_res.json()
        hardened_audit_id = hardened_data["audit_id"]
        hardened_score = hardened_data["compliance_score"]
        hardened_failed = hardened_data["open_findings"]

        # Hardened cisco must have significantly higher score than insecure
        assert hardened_score > insecure_score
        assert hardened_score >= 60.0
        assert hardened_failed < insecure_failed

        # 5. Ingest Fortinet Config
        ingest_forti = await client.post(
            "/api/v1/analysis/ingest",
            headers=headers,
            json={
                "content": INSECURE_FORTINET_CONFIG,
                "filename": "insecure-firewall.conf",
                "vendor_hint": "fortinet",
            },
        )
        assert ingest_forti.status_code == 201
        forti_cfg_id = ingest_forti.json()["analysis_id"]
        assert ingest_forti.json()["vendor"] == "fortinet"

        # 6. Fortinet Audit Details
        latest_forti_res = await client.get("/api/v1/audits/latest", headers=headers)
        assert latest_forti_res.status_code == 200
        forti_data = latest_forti_res.json()
        assert forti_data["vendor"] == "fortinet"

        # 7. Test Report Generation with Real Data (No hardcoded values)
        report_res = await client.post(
            "/api/v1/reports/generate",
            headers=headers,
            json={
                "report_type": "EXECUTIVE_AUDIT_SUMMARY",
                "audit_id": insecure_audit_id,
                "baseline_audit_id": insecure_audit_id,
                "title": "Cisco Insecure Edge Router Audit Report",
            },
        )
        assert report_res.status_code == 201
        report = report_res.json()
        assert report["sections"]["executive_summary"]["compliance_score"] == insecure_score
        assert report["sections"]["identity"]["vendor"] == "cisco"
        assert report["sections"]["identity"]["filename"] == "insecure-router.cfg"
        assert len(report["sections"]["identity"]["sha256"]) == 64

        # 8. Test Audit Comparison between Hardened and Insecure
        compare_res = await client.post(
            "/api/v1/reports/compare",
            headers=headers,
            json={
                "baseline_audit_id": insecure_audit_id,
                "remediated_audit_id": hardened_audit_id,
            },
        )
        assert compare_res.status_code == 200
        compare_data = compare_res.json()
        assert compare_data["baseline_compliance_score"] == insecure_score
        assert compare_data["remediated_compliance_score"] == hardened_score
        assert compare_data["compliance_improvement"] == round(hardened_score - insecure_score, 1)
        assert compare_data["resolved_count"] > 0

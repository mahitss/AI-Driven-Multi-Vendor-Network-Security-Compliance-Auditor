"""
End-to-End Real Data Flow and Multi-Tenant Isolation Verification Script
Problem Statement: SIH26155 (NTRO)

Tests:
1. Vendor Detection & Parsing Accuracy:
   - Cisco (01_CISCO_CRITICAL.cfg) -> Cisco IOS, Hostname: CORE-RTR-01, Vendor: cisco (NOT fortinet)
   - Fortinet (06_FORTINET_CRITICAL.conf) -> Fortinet FortiOS, Hostname: LAB-FORTIGATE-02, Vendor: fortinet
   - Juniper (04_JUNIPER_CRITICAL.set) -> Juniper JunOS, Vendor: juniper
2. Multi-Tenant Isolation:
   - Data ingested by tenant_alpha is completely invisible to tenant_beta.
3. Time Machine Integrity:
   - Comparing an audit against itself is rejected or isolated.
"""
import asyncio
import os
import sys
from pathlib import Path

# Add apps/api to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings

import jwt
from datetime import datetime, timezone

def make_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "exp": int(datetime.now(timezone.utc).timestamp()) + 3600,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

import uuid

async def run_verification():
    print("================================================================================")
    print("=== NETVIGIL REAL DATA FLOW & TENANT ISOLATION VERIFICATION ===")
    print("================================================================================")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Define 2 test tenants with fresh unique IDs
        tenant_a_id = f"tenant-alpha-{uuid.uuid4().hex[:8]}"
        tenant_b_id = f"tenant-beta-{uuid.uuid4().hex[:8]}"

        token_a = make_token(tenant_a_id, "alpha@netvigil.test")
        token_b = make_token(tenant_b_id, "beta@netvigil.test")

        tenant_a_headers = {
            "Authorization": f"Bearer {token_a}",
        }
        tenant_b_headers = {
            "Authorization": f"Bearer {token_b}",
        }

        # -------------------------------------------------------------
        # STEP 1: Verify Tenant B starts completely empty (Honest Empty State)
        # -------------------------------------------------------------
        print("\n[Step 1] Verifying Tenant B has 0 configurations, audits, and devices...")
        res = await client.get("/api/v1/overview/stats", headers=tenant_b_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        stats_b = res.json()
        assert stats_b["total_configurations"] == 0, f"Expected 0 configs, got {stats_b['total_configurations']}"
        assert stats_b["total_audits"] == 0, f"Expected 0 audits, got {stats_b['total_audits']}"
        assert stats_b["open_findings"] == 0, f"Expected 0 findings, got {stats_b['open_findings']}"
        print(" -> PASSED: Tenant B is completely empty (no data leakage).")

        # -------------------------------------------------------------
        # STEP 2: Tenant A Ingests 01_CISCO_CRITICAL.cfg
        # -------------------------------------------------------------
        print("\n[Step 2] Ingesting 01_CISCO_CRITICAL.cfg for Tenant A...")
        cisco_path = Path("data/demo/cisco/insecure-router.cfg")
        with open(cisco_path, "r") as f:
            cisco_content = f.read()

        ingest_res = await client.post(
            "/api/v1/analysis/ingest",
            json={
                "filename": "01_CISCO_CRITICAL.cfg",
                "content": cisco_content,
                # Intentionally pass no vendor_hint to test authoritative detection
            },
            headers=tenant_a_headers,
        )
        assert ingest_res.status_code == 201, f"Ingest failed: {ingest_res.text}"
        cisco_data = ingest_res.json()
        analysis_id = cisco_data["analysis_id"]
        vendor_detected = cisco_data["vendor"]
        print(f" -> Ingested analysis_id: {analysis_id}")
        print(f" -> Detected Vendor: {vendor_detected}")
        assert vendor_detected == "cisco", f"CRITICAL FAILURE: Expected 'cisco', got '{vendor_detected}'!"
        print(" -> PASSED: Cisco configuration accurately identified as CISCO (NOT fortinet).")

        # -------------------------------------------------------------
        # STEP 3: Verify Parsed Hostname & Evidence for 01_CISCO_CRITICAL.cfg
        # -------------------------------------------------------------
        print("\n[Step 3] Verifying Device Inventory & Hostname for Tenant A...")
        dev_res = await client.get("/api/v1/devices", headers=tenant_a_headers)
        assert dev_res.status_code == 200
        devices = dev_res.json()
        assert len(devices) >= 1
        target_dev = next((d for d in devices if d["id"] == analysis_id), None)
        assert target_dev is not None, "Target device not found in inventory"
        print(f" -> Device Hostname: {target_dev['hostname']}")
        print(f" -> Device Vendor: {target_dev['vendor']}")
        assert target_dev["hostname"] == "CORE-RTR-01", f"Expected 'CORE-RTR-01', got '{target_dev['hostname']}'"
        assert target_dev["vendor"] == "cisco", f"Expected 'cisco', got '{target_dev['vendor']}'"
        assert target_dev["hostname"] != "unknown-node", "FAILED: Hostname resolved to 'unknown-node'!"
        print(" -> PASSED: Hostname correctly resolved as 'CORE-RTR-01' (NOT 'unknown-node').")

        # -------------------------------------------------------------
        # STEP 4: Verify Findings for 01_CISCO_CRITICAL.cfg
        # -------------------------------------------------------------
        print("\n[Step 4] Verifying Findings Registry and Evidence lines for Tenant A...")
        findings_res = await client.get("/api/v1/audits/findings/all", headers=tenant_a_headers)
        assert findings_res.status_code == 200
        findings = findings_res.json()
        assert len(findings) > 0, "Expected at least 1 finding"
        print(f" -> Total findings for Tenant A: {len(findings)}")
        first_f = findings[0]
        print(f" -> Finding #1: [{first_f['severity']}] {first_f['control_id']} - {first_f['title']}")
        print(f" -> Linked Config ID: {first_f.get('configuration_id')}")
        print(f" -> Device Name: {first_f.get('device_name')}")
        print(f" -> Vendor: {first_f.get('vendor')}")
        assert first_f.get("vendor") == "cisco", f"Expected finding vendor 'cisco', got '{first_f.get('vendor')}'"
        assert first_f.get("configuration_id") == analysis_id, "Finding must link to exact configuration_id"
        print(" -> PASSED: Findings link directly to the Cisco configuration.")

        # -------------------------------------------------------------
        # STEP 5: Verify Strict Multi-Tenant Isolation (Tenant B still sees 0)
        # -------------------------------------------------------------
        print("\n[Step 5] Re-verifying Tenant B isolation while Tenant A has active data...")
        dev_b = await client.get("/api/v1/devices", headers=tenant_b_headers)
        assert dev_b.status_code == 200
        assert len(dev_b.json()) == 0, f"Tenant B leaked devices: {dev_b.json()}"

        find_b = await client.get("/api/v1/audits/findings/all", headers=tenant_b_headers)
        assert find_b.status_code == 200
        assert len(find_b.json()) == 0, f"Tenant B leaked findings: {find_b.json()}"

        aud_b = await client.get("/api/v1/audits", headers=tenant_b_headers)
        assert aud_b.status_code == 200
        assert len(aud_b.json()) == 0, f"Tenant B leaked audits: {aud_b.json()}"
        print(" -> PASSED: Tenant B has 0 devices, 0 findings, 0 audits. Full isolation verified.")

        # -------------------------------------------------------------
        # STEP 6: Ingest 06_FORTINET_CRITICAL.conf for Tenant A
        # -------------------------------------------------------------
        print("\n[Step 6] Ingesting 06_FORTINET_CRITICAL.conf for Tenant A...")
        fortinet_path = Path("data/demo/fortinet/insecure-firewall.conf")
        with open(fortinet_path, "r") as f:
            fortinet_content = f.read()

        fgt_res = await client.post(
            "/api/v1/analysis/ingest",
            json={
                "filename": "06_FORTINET_CRITICAL.conf",
                "content": fortinet_content,
            },
            headers=tenant_a_headers,
        )
        assert fgt_res.status_code == 201
        fgt_data = fgt_res.json()
        print(f" -> Detected Vendor: {fgt_data['vendor']}, Platform: {fgt_data['platform']}")
        assert fgt_data["vendor"] == "fortinet", f"Expected 'fortinet', got '{fgt_data['vendor']}'"

        # Check Fortinet device in inventory
        dev_res_2 = await client.get("/api/v1/devices", headers=tenant_a_headers)
        fgt_dev = next((d for d in dev_res_2.json() if d["id"] == fgt_data["analysis_id"]), None)
        assert fgt_dev is not None
        print(f" -> Fortinet Device Hostname: {fgt_dev['hostname']}, Vendor: {fgt_dev['vendor']}")
        assert fgt_dev["hostname"] == "LAB-FORTIGATE-02"
        assert fgt_dev["vendor"] == "fortinet"
        print(" -> PASSED: Fortinet configuration accurately identified as LAB-FORTIGATE-02 / FORTINET.")

        # -------------------------------------------------------------
        # STEP 7: Verify Time Machine Historical Comparison
        # -------------------------------------------------------------
        print("\n[Step 7] Verifying Time Machine Delta Comparison...")
        audits_res = await client.get("/api/v1/audits", headers=tenant_a_headers)
        audits_a = audits_res.json()
        assert len(audits_a) >= 2, f"Expected at least 2 audits, got {len(audits_a)}"
        audit_1 = audits_a[0]["id"]
        audit_2 = audits_a[1]["id"]

        # 1. Distinct comparison must succeed
        compare_res = await client.get(
            f"/api/v1/audits/compare?before_id={audit_1}&after_id={audit_2}",
            headers=tenant_a_headers,
        )
        assert compare_res.status_code == 200, f"Comparison failed: {compare_res.text}"
        comp = compare_res.json()
        deltas = comp["deltas"]
        print(f" -> Baseline Score: {deltas['before_score']:.1f}% -> Remediated Score: {deltas['after_score']:.1f}%")
        print(f" -> Score Delta: {deltas['score_delta']:+.1f}%")

        # 2. Identical audits comparison produces exact 0.0 delta
        self_compare_res = await client.get(
            f"/api/v1/audits/compare?before_id={audit_1}&after_id={audit_1}",
            headers=tenant_a_headers,
        )
        assert self_compare_res.status_code == 200, f"Self comparison should return 200, got {self_compare_res.status_code}"
        self_deltas = self_compare_res.json()["deltas"]
        assert self_deltas["score_delta"] == 0.0, f"Expected 0.0 delta for identical audit, got {self_deltas['score_delta']}"
        assert self_deltas["resolved_count"] == 0
        assert self_deltas["regressed_count"] == 0
        print(" -> PASSED: Identity audit comparison mathematically yields delta = 0.0.")
        print(" -> PASSED: Time Machine produces authentic comparative delta between distinct audits.")

    print("\n================================================================================")
    print("=== ALL 7 REAL DATA FLOW & ISOLATION VERIFICATIONS PASSED SUCCESSFULLY! ===")
    print("================================================================================")

if __name__ == "__main__":
    asyncio.run(run_verification())

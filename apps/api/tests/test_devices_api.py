"""
Integration Tests for Network Devices and Findings API
Problem Statement: SIH26155 (NTRO)
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

CISCO_SNIPPET = b"""! Cisco Secure Core Router
hostname CORE-RTR-01
ip domain name ntro.gov.in
service password-encryption
aaa new-model
enable secret 9 $9$J8f0d83jLk92.kE109k$O8L1iKj.1mQ09s8v7x6
ip ssh version 2
no ip http server
"""


@pytest.mark.asyncio
async def test_devices_and_findings_lifecycle(client: AsyncClient, db_session: AsyncSession):
    # 1. Initial devices list (empty before ingestion)
    resp = await client.get("/api/v1/devices")
    assert resp.status_code == 200
    assert resp.json() == []

    # 2. Ingest a Cisco configuration
    files = {"file": ("core-router.cfg", CISCO_SNIPPET, "text/plain")}
    upload_res = await client.post("/api/v1/configurations", files=files)
    assert upload_res.status_code == 201
    cfg_id = upload_res.json()["id"]

    # 3. Analyze configuration
    analyze_res = await client.post(f"/api/v1/configurations/{cfg_id}/analyze")
    assert analyze_res.status_code == 200

    # 4. Execute audit
    audit_res = await client.post(
        "/api/v1/audits",
        json={"configuration_id": cfg_id, "frameworks": ["CIS", "NIST", "STIG", "ISO"]},
    )
    assert audit_res.status_code == 201
    audit_id = audit_res.json()["audit_id"]

    # 5. Verify GET /devices now returns the evaluated device
    dev_res = await client.get("/api/v1/devices")
    assert dev_res.status_code == 200
    devices = dev_res.json()
    assert len(devices) == 1
    assert devices[0]["hostname"] == "CORE-RTR-01"
    assert devices[0]["vendor"] == "cisco"
    assert devices[0]["last_audit_id"] == audit_id
    assert devices[0]["status"] in ["HARDENED", "NEEDS_ATTENTION", "HIGH_RISK"]

    # 6. Verify GET /devices/{device_id} detail
    detail_res = await client.get(f"/api/v1/devices/{cfg_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["hostname"] == "CORE-RTR-01"
    assert detail["vendor"] == "cisco"
    assert detail["latest_audit_id"] == audit_id
    assert "normalized_profile" in detail

    # 7. Verify GET /devices/{device_id}/timeline
    tl_res = await client.get(f"/api/v1/devices/{cfg_id}/timeline")
    assert tl_res.status_code == 200
    events = tl_res.json()
    assert len(events) >= 2  # Ingestion + Audit

    # 8. Verify GET /audits/findings/all
    findings_res = await client.get("/api/v1/audits/findings/all")
    assert findings_res.status_code == 200
    findings = findings_res.json()
    assert len(findings) > 0

    # Filter findings by framework
    cis_res = await client.get("/api/v1/audits/findings/all?framework=CIS")
    assert cis_res.status_code == 200
    cis_findings = cis_res.json()
    assert all(f["framework"] == "CIS" for f in cis_findings)

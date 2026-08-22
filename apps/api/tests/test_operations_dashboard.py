"""
Security Operations Dashboard, Devices, Search & Reports API Tests
Problem Statement: SIH26155 (NTRO)
"""
import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_overview_posture_and_activity_api(client: AsyncClient):
    # 1. Ingest test config
    cfg_text = """! Cisco Router NTRO-OPS-01
version 15.2
hostname NTRO-OPS-01
no service password-encryption
service finger
ip ssh version 2
end"""
    files = {"file": ("cisco_ops_test.cfg", io.BytesIO(cfg_text.encode("utf-8")), "text/plain")}
    res = await client.post("/api/v1/configurations", files=files)
    assert res.status_code == 201
    cfg_id = res.json()["id"]

    # 2. Run Audit
    audit_res = await client.post("/api/v1/audits", json={"configuration_id": cfg_id, "frameworks": ["CIS"]})
    assert audit_res.status_code == 201

    # 3. Test /overview/stats
    stats_res = await client.get("/api/v1/overview/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_configurations" in stats
    assert "total_audits" in stats
    assert "compliance_score" in stats
    assert "severity_breakdown" in stats
    assert "framework_scores" in stats

    # 4. Test /overview/activity
    act_res = await client.get("/api/v1/overview/activity")
    assert act_res.status_code == 200
    activities = act_res.json()
    assert len(activities) > 0
    assert "type" in activities[0]
    assert "timestamp" in activities[0]

    # 5. Test /overview/search
    search_res = await client.get("/api/v1/overview/search?q=cisco")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert "configurations" in search_data
    assert "audits" in search_data
    assert len(search_data["configurations"]) > 0


@pytest.mark.asyncio
async def test_devices_and_reports_api(client: AsyncClient):
    # Ingest test config
    cfg_text = """! Cisco Router NTRO-DEV-01
version 15.2
hostname NTRO-DEV-01
no service password-encryption
service finger
ip ssh version 2
end"""
    files = {"file": ("cisco_dev_test.cfg", io.BytesIO(cfg_text.encode("utf-8")), "text/plain")}
    res = await client.post("/api/v1/configurations", files=files)
    assert res.status_code == 201
    cfg_id = res.json()["id"]

    # Run Audit
    audit_res = await client.post("/api/v1/audits", json={"configuration_id": cfg_id, "frameworks": ["CIS"]})
    assert audit_res.status_code == 201

    # 1. List Devices
    devices_res = await client.get("/api/v1/devices")
    assert devices_res.status_code == 200
    devices = devices_res.json()
    assert len(devices) > 0

    device_id = devices[0]["id"]

    # 2. Device Detail
    dev_detail_res = await client.get(f"/api/v1/devices/{device_id}")
    assert dev_detail_res.status_code == 200
    dev_data = dev_detail_res.json()
    assert "hostname" in dev_data
    assert "vendor" in dev_data
    assert "open_findings_count" in dev_data

    # 3. Device Timeline
    tl_res = await client.get(f"/api/v1/devices/{device_id}/timeline")
    assert tl_res.status_code == 200
    assert len(tl_res.json()) > 0

    # 4. Generate Report
    report_res = await client.post(
        "/api/v1/reports/generate",
        json={"report_type": "EXECUTIVE_AUDIT_SUMMARY", "title": "NTRO Executive Security Audit Report"},
    )
    assert report_res.status_code == 201
    report = report_res.json()
    assert "id" in report
    assert "sections" in report
    assert "executive_summary" in report["sections"]

    # 5. List Reports
    rep_list = await client.get("/api/v1/reports")
    assert rep_list.status_code == 200
    assert len(rep_list.json()) >= 1

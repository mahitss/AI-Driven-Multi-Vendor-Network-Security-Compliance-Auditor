"""
Compliance Audits & Frameworks API Integration Tests
"""
import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_full_audit_lifecycle_api(client: AsyncClient):
    # 1. Upload sample Cisco config
    config_content = """
    !
    version 17.3
    hostname CORE-RTR-01
    service password-encryption
    no service finger
    no ip http server
    ip http secure-server
    ip ssh version 2
    enable secret 9 $9$dummysecret
    aaa new-model
    logging host 10.100.20.50
    ntp server 10.100.5.1
    spanning-tree portfast bpduguard default
    line vty 0 4
     transport input ssh
     access-class 10 in
    end
    """
    files = {"file": ("audit_target.cfg", io.BytesIO(config_content.encode("utf-8")), "text/plain")}
    upload_res = await client.post("/api/v1/configurations", files=files)
    assert upload_res.status_code == 201
    config_id = upload_res.json()["id"]

    # 2. Trigger Compliance Audit across CIS, NIST, STIG, ISO
    audit_payload = {
        "configuration_id": config_id,
        "frameworks": ["CIS", "NIST", "STIG", "ISO"],
    }
    audit_res = await client.post("/api/v1/audits", json=audit_payload)
    assert audit_res.status_code == 201
    audit_data = audit_res.json()

    assert "audit_id" in audit_data
    assert audit_data["status"] == "COMPLETED"
    assert audit_data["overall_score"] >= 80.0
    assert "CIS" in audit_data["frameworks"]
    assert "NIST" in audit_data["frameworks"]
    assert "STIG" in audit_data["frameworks"]
    assert "ISO" in audit_data["frameworks"]

    audit_id = audit_data["audit_id"]

    # 3. Fetch Audit Details
    detail_res = await client.get(f"/api/v1/audits/{audit_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert len(detail_data["findings"]) >= 40  # 10+ checks * 4 frameworks
    assert detail_data["score"] == audit_data["overall_score"]

    # 4. Fetch Findings with Filtering (e.g. framework=CIS, severity=HIGH)
    findings_res = await client.get(f"/api/v1/audits/{audit_id}/findings?framework=CIS")
    assert findings_res.status_code == 200
    cis_findings = findings_res.json()
    assert len(cis_findings) >= 10
    assert all(f["framework"] == "CIS" for f in cis_findings)

    # 5. Fetch Frameworks Catalog
    fw_res = await client.get("/api/v1/frameworks")
    assert fw_res.status_code == 200
    fw_list = fw_res.json()
    assert len(fw_list) == 4
    fw_keys = [f["framework"] for f in fw_list]
    assert "CIS" in fw_keys and "NIST" in fw_keys and "STIG" in fw_keys and "ISO" in fw_keys

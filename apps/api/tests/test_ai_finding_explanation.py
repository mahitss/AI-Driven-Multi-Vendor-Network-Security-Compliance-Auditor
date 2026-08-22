"""
AI Finding Explanation Service & API Tests
Problem Statement: SIH26155 (NTRO)
"""
import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ai_finding_explanation_api_flow(client: AsyncClient):
    # 1. Upload sample Cisco config with clear violation (Telnet enabled)
    config_content = """
    !
    version 17.3
    hostname TEST-RTR
    line vty 0 4
     transport input telnet
    end
    """
    files = {"file": ("insecure_telnet.cfg", io.BytesIO(config_content.encode("utf-8")), "text/plain")}
    upload_res = await client.post("/api/v1/configurations", files=files)
    assert upload_res.status_code == 201
    config_id = upload_res.json()["id"]

    # 2. Run Audit
    audit_res = await client.post(
        "/api/v1/audits",
        json={"configuration_id": config_id, "frameworks": ["CIS"]},
    )
    assert audit_res.status_code == 201
    audit_id = audit_res.json()["audit_id"]

    # 3. Fetch Findings and locate the Telnet finding
    findings_res = await client.get(f"/api/v1/audits/{audit_id}/findings")
    assert findings_res.status_code == 200
    findings = findings_res.json()
    assert len(findings) > 0

    telnet_finding = next((f for f in findings if "Telnet" in f["title"]), findings[0])
    finding_id = telnet_finding["id"]

    # 4. Request AI Finding Explanation
    exp_res = await client.post(f"/api/v1/ai/findings/{finding_id}/explanation")
    assert exp_res.status_code == 200
    exp_data = exp_res.json()

    assert "summary" in exp_data
    assert "why_it_matters" in exp_data
    assert "technical_explanation" in exp_data
    assert "risk_context" in exp_data
    assert "recommended_action" in exp_data
    assert exp_data["confidence"] >= 0.70
    assert "disclaimer" in exp_data

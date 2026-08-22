"""
Configuration Analysis API Integration Tests
"""
import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_analyze_cisco_configuration_endpoint(client: AsyncClient):
    cisco_content = (
        "!\n"
        "version 17.3\n"
        "hostname CORE-RTR-01\n"
        "ip ssh version 2\n"
        "service password-encryption\n"
        "enable secret 9 $9$dummysecret\n"
        "logging host 10.100.20.50\n"
        "ntp server 10.100.5.1\n"
        "line vty 0 4\n"
        " transport input ssh\n"
        " access-class 10 in\n"
        "unknown-directive-test-01\n"
        "end\n"
    )

    # 1. Upload configuration
    files = {"file": ("core_rtr.cfg", io.BytesIO(cisco_content.encode("utf-8")), "text/plain")}
    upload_res = await client.post("/api/v1/configurations", files=files)
    assert upload_res.status_code == 201
    config_id = upload_res.json()["id"]

    # 2. Trigger Analysis
    analyze_res = await client.post(f"/api/v1/configurations/{config_id}/analyze")
    assert analyze_res.status_code == 200
    data = analyze_res.json()

    assert data["configuration_id"] == config_id
    assert data["vendor"] == "cisco"
    assert data["status"] == "completed"
    assert data["facts_extracted"] > 5
    assert data["unknown_items_count"] >= 1
    assert data["parser_confidence"] > 0.9

    profile = data["normalized_profile"]
    assert profile["identity"]["hostname"]["value"] == "CORE-RTR-01"
    assert profile["remote_access"]["ssh_version"]["value"] == 2
    assert profile["remote_access"]["vty_access_class_applied"]["value"] is True
    assert profile["authentication"]["password_encryption_enabled"]["value"] is True

    # 3. Fetch cached Analysis
    get_res = await client.get(f"/api/v1/configurations/{config_id}/analysis")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["facts_extracted"] == data["facts_extracted"]
    assert get_data["unknown_items_count"] == data["unknown_items_count"]

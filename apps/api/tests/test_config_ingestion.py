"""
Configuration Ingestion & Storage Integration Tests
"""
import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_upload_cisco_configuration_success(client: AsyncClient):
    cisco_content = (
        "!\n"
        "version 17.3\n"
        "hostname EDGE-RTR-01\n"
        "service timestamps debug datetime msec\n"
        "enable secret 9 $9$dummysecret\n"
        "line vty 0 4\n"
        " transport input ssh\n"
        "end\n"
    )

    files = {
        "file": ("edge_rtr.cfg", io.BytesIO(cisco_content.encode("utf-8")), "text/plain")
    }

    response = await client.post("/api/v1/configurations", files=files)
    assert response.status_code == 201
    data = response.json()

    assert data["id"] is not None
    assert data["original_filename"] == "edge_rtr.cfg"
    assert data["detected_vendor"] == "cisco"
    assert data["detected_platform"] == "ios"
    assert data["detection_confidence"] > 0.5
    assert len(data["hash"]) == 64  # SHA-256 length


@pytest.mark.asyncio
async def test_upload_rejects_invalid_file_extension(client: AsyncClient):
    invalid_content = "binary payload or python script"
    files = {
        "file": ("exploit.exe", io.BytesIO(invalid_content.encode("utf-8")), "application/octet-stream")
    }

    response = await client.post("/api/v1/configurations", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INVALID_FILE_TYPE"


@pytest.mark.asyncio
async def test_upload_rejects_empty_file(client: AsyncClient):
    files = {
        "file": ("empty.cfg", io.BytesIO(b""), "text/plain")
    }

    response = await client.post("/api/v1/configurations", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "CONFIGURATION_UPLOAD_FAILED"


@pytest.mark.asyncio
async def test_list_and_get_configurations(client: AsyncClient):
    # Upload one configuration first
    juniper_content = (
        "version 21.4R3;\n"
        "system {\n"
        "  host-name JUNIPER-CORE;\n"
        "}\n"
    )
    files = {
        "file": ("juniper.conf", io.BytesIO(juniper_content.encode("utf-8")), "text/plain")
    }
    upload_res = await client.post("/api/v1/configurations", files=files)
    assert upload_res.status_code == 201
    config_id = upload_res.json()["id"]

    # List configurations
    list_res = await client.get("/api/v1/configurations")
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) >= 1
    assert any(item["id"] == config_id for item in items)

    # Get single configuration by ID
    get_res = await client.get(f"/api/v1/configurations/{config_id}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["id"] == config_id
    assert "system {\n  host-name JUNIPER-CORE;" in detail["raw_content"]


@pytest.mark.asyncio
async def test_get_nonexistent_configuration_returns_404(client: AsyncClient):
    response = await client.get("/api/v1/configurations/non-existent-uuid-12345")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "RESOURCE_NOT_FOUND"


@pytest.mark.asyncio
async def test_detect_vendor_raw_endpoint(client: AsyncClient):
    fortinet_payload = {
        "content": "config system global\n set hostname FGT-TEST\nend",
        "filename": "fgt.conf",
    }
    response = await client.post("/api/v1/configurations/detect-vendor", json=fortinet_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["vendor"] == "fortinet"
    assert data["platform"] == "fortios"
    assert data["confidence"] > 0.5

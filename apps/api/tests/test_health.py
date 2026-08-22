"""
Health Endpoint Tests
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint_returns_200_and_healthy_status(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "healthy"
    assert data["service"] == "NetVigil"
    assert "version" in data
    assert data["database"]["status"] == "connected"
    assert "vendor_detector" in data["components"]
    assert "universal_schema" in data["components"]
    assert response.headers.get("X-Request-ID") is not None


@pytest.mark.asyncio
async def test_root_endpoint_returns_service_metadata(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "NetVigil"
    assert data["health_check"] == "/health"
    assert data["docs_url"] if "docs_url" in data else data["documentation"] == "/docs"

"""
Health Endpoint Tests
Problem Statement: SIH26155 (NTRO)
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint_returns_200_and_healthy_status(client: AsyncClient):
    """Verifies that GET /health returns HTTP 200 and full system telemetry structure without auth."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] in ["healthy", "degraded"]
    assert data["service"] == "NetVigil"
    assert "version" in data
    assert "environment" in data
    assert "database" in data
    assert data["database"]["status"] in ["connected", "disconnected"]
    assert "components" in data
    assert "vendor_detector" in data["components"]
    assert "universal_schema" in data["components"]
    assert "deterministic_engine" in data["components"]
    assert response.headers.get("X-Request-ID") is not None


@pytest.mark.asyncio
async def test_health_public_no_auth_required(client: AsyncClient):
    """Verifies that GET /health is strictly public and does not require Supabase JWT authorization."""
    response = await client.get("/health", headers={})
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "NetVigil"


@pytest.mark.asyncio
async def test_api_v1_health_endpoint_returns_200(client: AsyncClient):
    """Verifies that GET /api/v1/health is also reachable and returns HTTP 200."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "NetVigil"


@pytest.mark.asyncio
async def test_cors_headers_on_vercel_origin(client: AsyncClient):
    """Verifies that CORS allows Vercel production origin."""
    response = await client.options(
        "/health",
        headers={
            "Origin": "https://ai-driven-multi-vendor-network-security.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers


@pytest.mark.asyncio
async def test_root_endpoint_returns_service_metadata(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "NetVigil"
    assert data["health_check"] == "/health"
    assert "docs" in (data.get("docs_url") or data.get("documentation"))

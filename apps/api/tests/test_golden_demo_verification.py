"""
NetVigil Golden Demo Verification Test
Problem Statement: SIH26155 (NTRO)

Tests the /api/v1/overview/demo/init and /api/v1/overview/diagnostics endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_golden_demo_initialization_and_diagnostics(client: AsyncClient):
    # 1. Test Demo Initialization
    res = await client.post("/api/v1/overview/demo/init")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "ready"
    assert data["demo_mode"] is True
    assert data["device_name"] == "CORE-RTR-01"
    assert data["vendor"] == "cisco"
    assert "configuration_id" in data
    assert "audit_id" in data
    assert data["compliance_score"] > 0
    assert data["critical_findings"] > 0
    assert data["total_risks"] > 0
    assert data["total_remediations"] > 0

    # Verify Latencies
    latencies = data["pipeline_latency"]
    assert latencies["ingestion_ms"] >= 0
    assert latencies["parsing_and_normalization_ms"] >= 0
    assert latencies["compliance_evaluation_ms"] >= 0
    assert latencies["risk_scoring_ms"] >= 0
    assert latencies["total_ms"] > 0

    # 2. Test Engine Diagnostics
    diag_res = await client.get("/api/v1/overview/diagnostics")
    assert diag_res.status_code == 200
    diag = diag_res.json()

    assert "engine_version" in diag
    assert "benchmarks" in diag
    assert "cisco" in diag["supported_vendors"]
    assert "juniper" in diag["supported_vendors"]
    assert "fortinet" in diag["supported_vendors"]
    assert diag["security_invariants"]["zero_automated_execution"] is True

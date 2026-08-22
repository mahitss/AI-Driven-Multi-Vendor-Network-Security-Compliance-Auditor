"""
AI Unknown Configuration Interpretation Tests
Problem Statement: SIH26155 (NTRO)
"""
import pytest
from httpx import AsyncClient
from app.services.ai.unknown_interpreter_service import UnknownConfigInterpreterService


@pytest.mark.asyncio
async def test_unknown_syntax_interpretation_service():
    res = await UnknownConfigInterpreterService.interpret_command(
        raw_command="ip ssh timeout 15",
        vendor_hint="cisco",
    )
    assert res.status in ["candidate", "uncertain", "unsupported"]
    assert res.normalized_category in [
        "remote_access",
        "authentication",
        "authorization",
        "logging",
        "time_sync",
        "access_control",
        "services",
        "management",
        "network_security",
    ]
    assert res.confidence >= 0.0
    assert res.confidence_tier in ["high", "review", "low"]
    assert len(res.semantic_meaning) > 0


@pytest.mark.asyncio
async def test_unknown_syntax_interpretation_api_endpoint(client: AsyncClient):
    payload = {
        "raw_command": "set system login message 'WARNING: UNLICENSED ACCESS PROHIBITED'",
        "vendor_hint": "juniper",
    }
    resp = await client.post("/api/v1/ai/interpret-syntax", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "normalized_category" in data
    assert "confidence" in data
    assert "confidence_tier" in data

"""
Normalized Property Safety Allowlist Security Tests
Problem Statement: SIH26155 (NTRO)
"""
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.services.training.allowlist import (
    is_property_allowlisted,
    validate_and_cast_property_value,
)


def test_allowlist_unit_validations():
    # Valid allowlisted properties
    assert is_property_allowlisted("remote_access.ssh_enabled")
    assert is_property_allowlisted("time_sync.ntp_enabled")
    assert is_property_allowlisted("authentication.aaa_enabled")

    # Invalid / Malicious properties
    assert not is_property_allowlisted("../../database")
    assert not is_property_allowlisted("__proto__.admin")
    assert not is_property_allowlisted("arbitrary_vendor_field")

    # Type casting validations
    valid, _, val = validate_and_cast_property_value("remote_access.inactivity_timeout_minutes", "15")
    assert valid and val == 15

    valid, _, val = validate_and_cast_property_value("remote_access.ssh_enabled", "enable")
    assert valid and val is True

    valid, err, _ = validate_and_cast_property_value("../../database", True)
    assert not valid
    assert "not in the approved Universal Security Model allowlist" in err


@pytest.mark.asyncio
async def test_api_rejects_non_allowlisted_property():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        payload = {
            "vendor": "cisco",
            "raw_pattern": "malicious command",
            "candidate_property": "../../database/users",
            "candidate_value": True,
            "semantic_meaning": "Attempted path traversal",
        }
        res = await client.post("/api/v1/training/mappings", json=payload)
        assert res.status_code == 422 or res.status_code == 400
        data = res.json()
        assert "allowlist" in str(data).lower() or "not in the approved" in str(data).lower()

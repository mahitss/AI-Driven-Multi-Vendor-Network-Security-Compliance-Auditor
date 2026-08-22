"""
Training Mapping Rejection & Invalidation Tests
Problem Statement: SIH26155 (NTRO)
"""
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_rejected_mappings_are_never_trusted():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Create candidate mapping
        create_payload = {
            "vendor": "juniper",
            "raw_pattern": "set bogus-admin-flag insecure",
            "candidate_property": "remote_access.telnet_enabled",
            "candidate_value": False,
            "semantic_meaning": "Bogus directive misinterpreted by AI",
            "status": "PENDING",
        }
        res = await client.post("/api/v1/training/mappings", json=create_payload)
        assert res.status_code == 201
        mapping_id = res.json()["id"]

        # Reject mapping
        reject_payload = {
            "reason": "Directive is a proprietary vendor telemetry string, not a telnet control.",
            "user_email": "security-analyst@ntro.gov.in",
        }
        res = await client.post(f"/api/v1/training/mappings/{mapping_id}/reject", json=reject_payload)
        assert res.status_code == 200
        rejected_data = res.json()
        assert rejected_data["status"] == "REJECTED"
        assert "proprietary vendor telemetry" in rejected_data["rejection_reason"]

        # Verify not in approved mappings list
        res = await client.get("/api/v1/training/mappings?status=APPROVED")
        assert res.status_code == 200
        approved_ids = [m["id"] for m in res.json()]
        assert mapping_id not in approved_ids

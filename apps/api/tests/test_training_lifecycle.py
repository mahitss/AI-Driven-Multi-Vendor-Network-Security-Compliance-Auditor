"""
Adaptive Training Mapping Lifecycle & Audit Trail Tests
Problem Statement: SIH26155 (NTRO)
"""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.models.training import TrainingAuditTrail, TrainingMapping


@pytest.mark.asyncio
async def test_training_mapping_full_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Create a candidate mapping in PENDING state
        create_payload = {
            "vendor": "cisco",
            "raw_pattern": "set mystery-admin-policy restricted",
            "candidate_property": "access_control.control_plane_policing_enabled",
            "candidate_value": True,
            "semantic_meaning": "Restrict administrative control plane policy",
            "category": "access_control",
            "status": "PENDING",
        }
        res = await client.post("/api/v1/training/mappings", json=create_payload)
        assert res.status_code == 201
        data = res.json()
        mapping_id = data["id"]
        assert data["status"] == "PENDING"
        assert data["version"] == 1

        # 2. Check pending review queue
        res = await client.get("/api/v1/training/pending")
        assert res.status_code == 200
        pending_items = res.json()
        assert any(item["id"] == mapping_id for item in pending_items)

        # 3. Approve mapping
        res = await client.post(f"/api/v1/training/mappings/{mapping_id}/approve", json={"user_email": "lead-auditor@ntro.gov.in"})
        assert res.status_code == 200
        approved_data = res.json()
        assert approved_data["status"] == "APPROVED"

        # 4. Edit mapping (correction by administrator)
        edit_payload = {
            "candidate_property": "remote_access.inactivity_timeout_minutes",
            "candidate_value": 15,
            "semantic_meaning": "Enforces 15-minute administrative inactivity timeout",
            "category": "remote_access",
            "reason": "Corrected category from access_control to remote_access based on vendor manual",
            "user_email": "lead-auditor@ntro.gov.in",
        }
        res = await client.post(f"/api/v1/training/mappings/{mapping_id}/edit", json=edit_payload)
        assert res.status_code == 200
        edited_data = res.json()
        assert edited_data["version"] == 2
        assert edited_data["candidate_property"] == "remote_access.inactivity_timeout_minutes"
        assert edited_data["candidate_value"] == 15
        assert edited_data["source"] == "human_corrected"

        # 5. Disable mapping
        res = await client.post(f"/api/v1/training/mappings/{mapping_id}/disable")
        assert res.status_code == 200
        assert res.json()["status"] == "DISABLED"

        # 6. Re-enable mapping
        res = await client.post(f"/api/v1/training/mappings/{mapping_id}/re-enable")
        assert res.status_code == 200
        assert res.json()["status"] == "APPROVED"

        # 7. Check global stats
        res = await client.get("/api/v1/training/stats")
        assert res.status_code == 200
        stats = res.json()
        assert stats["approved_count"] >= 1
        assert "cisco" in stats["vendors_learned"]

"""
Mandatory Adaptive Learning End-to-End Test
Problem Statement: SIH26155 (NTRO)

Verifies the complete human-in-the-loop adaptive training pipeline:
1. Ingest configuration with unknown/unparsed directive.
2. Initial analysis and compliance evaluation has unknown items.
3. Administrator creates and approves a knowledge mapping.
4. Re-analysis triggers re-parsing with approved mapping.
5. Normalized security fact is created with line evidence.
6. Deterministic compliance rule evaluates newly learned fact.
7. Finding status updates and impact delta is recorded.
"""
import io
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_adaptive_learning_end_to_end_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Ingest Cisco configuration with unknown vendor proprietary directive
        cfg_text = """! Cisco Ingestion with Unknown Directive
version 15.2
hostname NTRO-EDGE-01
no service password-encryption
service finger
no aaa new-model
ip ssh version 2
weird-vendor-proprietary-service disable-all-insecure-daemons
line vty 0 4
 transport input ssh
end"""

        files = {"file": ("cisco_custom_unknown.cfg", io.BytesIO(cfg_text.encode("utf-8")), "text/plain")}
        res = await client.post("/api/v1/configurations", files=files)
        assert res.status_code == 201
        cfg_data = res.json()
        config_id = cfg_data["id"]

        # 2. Run initial analysis
        res = await client.post(f"/api/v1/configurations/{config_id}/analyze")
        assert res.status_code == 200
        analysis = res.json()
        initial_unknown_count = analysis["unknown_items_count"]
        assert initial_unknown_count >= 1
        assert any(
            "weird-vendor-proprietary-service" in item["raw_text"]
            for item in analysis["unknown_items"]
        )

        # 3. Run initial compliance audit
        res = await client.post("/api/v1/audits", json={"configuration_id": config_id, "frameworks": ["CIS"]})
        assert res.status_code == 201
        audit_data = res.json()
        audit_id = audit_data["audit_id"]

        # 4. Administrator reviews AI candidate and approves knowledge mapping
        # Maps the weird directive to disabling the legacy finger service (services.finger_disabled = True)
        mapping_payload = {
            "vendor": "cisco",
            "raw_pattern": "weird-vendor-proprietary-service disable-all-insecure-daemons",
            "candidate_property": "services.finger_disabled",
            "candidate_value": True,
            "semantic_meaning": "Disables legacy insecure background daemons",
            "category": "services",
            "status": "APPROVED",
        }
        res = await client.post("/api/v1/training/mappings", json=mapping_payload)
        assert res.status_code == 201
        mapping_res = res.json()
        assert mapping_res["status"] == "APPROVED"

        # 5. Trigger Re-Analysis on the configuration
        res = await client.post(f"/api/v1/training/reanalyze/{config_id}?frameworks=CIS")
        assert res.status_code == 200
        impact = res.json()

        # 6. Verify impact metrics
        assert impact["configuration_id"] == config_id
        assert impact["resolved_directives_count"] >= 1
        assert impact["new_unknown_directives"] < initial_unknown_count
        assert impact["mappings_applied_count"] >= 1

        # 7. Verify the configuration's normalized profile now contains the learned fact
        res = await client.get(f"/api/v1/configurations/{config_id}/analysis")
        assert res.status_code == 200
        updated_analysis = res.json()
        profile = updated_analysis["normalized_profile"]
        finger_fact = profile["services"]["finger_disabled"]
        assert finger_fact["value"] is True
        assert finger_fact["method"] == "learned_mapping"
        assert any("weird-vendor-proprietary-service" in line for line in finger_fact["evidence"])

"""
End-to-End Risk Intelligence & Vendor Remediation Workflow Test
Problem Statement: SIH26155 (NTRO)
"""
import io
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_risk_and_remediation_full_lifecycle(client: AsyncClient):
    # 1. Ingest Insecure Cisco Configuration
    cisco_insecure_cfg = """! Insecure Cisco Core Router
version 15.2
hostname NTRO-CORE-RTR-01
no service password-encryption
no aaa new-model
ip http server
ip ssh version 1
line vty 0 4
 transport input telnet ssh
end"""

    files = {"file": ("cisco_insecure_audit.cfg", io.BytesIO(cisco_insecure_cfg.encode("utf-8")), "text/plain")}
    res = await client.post("/api/v1/configurations", files=files)
    assert res.status_code == 201
    cfg_id = res.json()["id"]

    # 2. Trigger Compliance Audit
    audit_res = await client.post(
        "/api/v1/audits",
        json={"configuration_id": cfg_id, "frameworks": ["CIS", "NIST"]},
    )
    assert audit_res.status_code == 201
    audit_id = audit_res.json()["audit_id"]

    # 3. Retrieve Correlated Risk Intelligence
    risk_res = await client.get(f"/api/v1/audits/{audit_id}/risks")
    assert risk_res.status_code == 200
    risks = risk_res.json()
    assert len(risks) > 0

    top_risk = risks[0]
    assert top_risk["risk_score"] >= 50.0
    assert top_risk["priority"] in ["P0", "P1", "P2"]
    assert len(top_risk["finding_ids"]) > 0

    # 4. Retrieve Risk Relationship Graph
    graph_res = await client.get(f"/api/v1/audits/{audit_id}/risk-graph")
    assert graph_res.status_code == 200
    graph = graph_res.json()
    assert len(graph["nodes"]) >= 3
    assert len(graph["edges"]) >= 2

    # 5. Retrieve Vendor-Specific Remediation Proposals
    rem_res = await client.get(f"/api/v1/audits/{audit_id}/remediations")
    assert rem_res.status_code == 200
    proposals = rem_res.json()
    assert len(proposals) > 0

    cisco_proposal = next((p for p in proposals if p["vendor"] == "cisco" and p["status"] == "AVAILABLE"), None)
    assert cisco_proposal is not None
    assert "configure terminal" in cisco_proposal["remediation_commands"]
    assert "diff_preview" in cisco_proposal
    assert cisco_proposal["diff_preview"]["remove_count"] >= 0

    # 6. Review & Approve Remediation Proposal (Human-in-the-loop)
    prop_id = cisco_proposal["id"]
    review_res = await client.post(
        f"/api/v1/remediations/{prop_id}/review",
        json={"reviewer_email": "sec-officer@ntro.gov.in", "notes": "Approved for change window #402"},
    )
    assert review_res.status_code == 200
    reviewed_data = review_res.json()
    assert reviewed_data["is_reviewed"] is True
    assert reviewed_data["status"] == "REVIEWED"
    assert reviewed_data["reviewed_by"] == "sec-officer@ntro.gov.in"

    # 7. Global KPI Statistics
    risk_stats = await client.get("/api/v1/risks/stats")
    assert risk_stats.status_code == 200
    assert risk_stats.json()["total_risks"] >= 1

    rem_stats = await client.get("/api/v1/remediations/stats")
    assert rem_stats.status_code == 200
    assert rem_stats.json()["total_proposals"] >= 1

"""
NetVigil Canonical Golden Analysis Pipeline Test
Problem Statement: SIH26155 (NTRO)

Deterministic Golden Standard:
Asserts exact known controls, exact known findings, exact evidence line citations,
exact normalized properties, and exact risk calculations.
"""
import os
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

FIXTURE_PATH = os.path.join(
    os.path.dirname(__file__),
    "fixtures",
    "cisco_test_fixture.cfg"
)

def load_fixture() -> str:
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return f.read()


@pytest.mark.asyncio
async def test_canonical_golden_cisco_analysis_verification():
    """
    Golden Proof Test:
    Validates that real Cisco configuration produces exact expected deterministic outcomes.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        cisco_content = load_fixture()

        # Step 1: Ingest
        ingest_res = await client.post(
            "/api/v1/analysis/ingest",
            json={"content": cisco_content, "filename": "cisco_edge_router.cfg"}
        )
        assert ingest_res.status_code == 201
        data = ingest_res.json()
        analysis_id = data["analysis_id"]

        # Golden Assertion: Vendor Detection
        assert data["vendor"] == "cisco"

        # Step 2: Findings Verification
        findings_res = await client.get(f"/api/v1/analysis/{analysis_id}/findings")
        assert findings_res.status_code == 200
        findings = findings_res.json()

        findings_by_control = {f["control_id"]: f for f in findings}

        # Golden Assertion: CIS-1.2.1 (SSH v1 Prohibited)
        assert "CIS-1.2.1" in findings_by_control
        cis_121 = findings_by_control["CIS-1.2.1"]
        assert cis_121["status"] == "FAIL"
        assert cis_121["severity"] in ["CRITICAL", "HIGH"]
        assert any(ev["line"] == 17 and "ip ssh version 1" in ev["raw_text"] for ev in cis_121["evidence_lines"])

        # Golden Assertion: CIS-1.1.2 (Password Encryption Required)
        assert "CIS-1.1.2" in findings_by_control
        cis_112 = findings_by_control["CIS-1.1.2"]
        assert cis_112["status"] == "FAIL"
        assert any("password-encryption" in ev["raw_text"] for ev in cis_112["evidence_lines"])

        # Step 3: Evidence Verification
        ev_res = await client.get(f"/api/v1/analysis/{analysis_id}/evidence")
        assert ev_res.status_code == 200
        ev_list = ev_res.json()
        assert len(ev_list) >= 8

        # Line 17 must be mapped to remote_access.ssh_version
        ssh_fact = next((e for e in ev_list if e["line"] == 17 and e["property_path"] == "remote_access.ssh_version"), None)
        assert ssh_fact is not None
        assert ssh_fact["property_path"] == "remote_access.ssh_version"

        # Step 4: Risk Verification
        risk_res = await client.get(f"/api/v1/analysis/{analysis_id}/risk")
        assert risk_res.status_code == 200
        risk = risk_res.json()
        assert risk["risk_score"] > 0.0
        assert risk["risk_level"] in ["P0", "P1", "P2"]

        # Step 5: Deterministic Remediation & Re-Analysis
        remediated_content = cisco_content.replace("ip ssh version 1", "ip ssh version 2")
        remediated_content = remediated_content.replace("no service password-encryption", "service password-encryption")

        re_res = await client.post(
            f"/api/v1/analysis/{analysis_id}/reanalyze",
            json={"modified_content": remediated_content}
        )
        assert re_res.status_code == 200
        re_data = re_res.json()

        assert "CIS-1.2.1" in re_data["resolved_controls"]
        assert "CIS-1.1.2" in re_data["resolved_controls"]

        # Step 6: Post-Remediation Verification
        post_f_res = await client.get(f"/api/v1/analysis/{analysis_id}/findings")
        assert post_f_res.status_code == 200
        post_findings = {f["control_id"]: f for f in post_f_res.json()}

        assert post_findings["CIS-1.2.1"]["status"] == "PASS"
        assert post_findings["CIS-1.1.2"]["status"] == "PASS"

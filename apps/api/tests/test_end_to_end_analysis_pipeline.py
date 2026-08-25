"""
NetVigil End-to-End Deterministic Analysis Pipeline Tests
Problem Statement: SIH26155 (NTRO)

Tests the complete vertical slice:
REAL CISCO CONFIG → INGEST → VENDOR DETECT → PARSE AST → CONTROLS → EVIDENCE → FINDINGS → RISK → REMEDIATE → RE-ANALYZE → VERIFIED PASS
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

def load_cisco_fixture() -> str:
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return f.read()


@pytest.mark.asyncio
async def test_full_deterministic_analysis_pipeline_lifecycle():
    """
    Executes the 14-step deterministic security analysis pipeline using a real Cisco IOS configuration.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Load real Cisco configuration fixture
        cisco_content = load_cisco_fixture()
        assert "ip ssh version 1" in cisco_content
        assert "hostname EDGE-RTR-01" in cisco_content

        # 2. Ingest configuration
        ingest_payload = {
            "content": cisco_content,
            "filename": "cisco_edge_router.cfg",
        }
        ingest_res = await client.post("/api/v1/analysis/ingest", json=ingest_payload)
        assert ingest_res.status_code == 201, ingest_res.text
        ingest_data = ingest_res.json()

        analysis_id = ingest_data["analysis_id"]
        assert analysis_id.startswith("cfg-") or len(analysis_id) > 10
        assert ingest_data["vendor"] == "cisco"
        assert ingest_data["status"] == "INGESTED"
        assert ingest_data["facts_extracted_count"] >= 10
        assert ingest_data["lines_count"] >= 35

        # 3. Get Analysis Status
        status_res = await client.get(f"/api/v1/analysis/{analysis_id}")
        assert status_res.status_code == 200
        status_data = status_res.json()

        assert status_data["analysis_id"] == analysis_id
        assert status_data["vendor"] == "cisco"
        assert status_data["status"] == "COMPLETED"
        assert status_data["controls_evaluated_count"] >= 10
        assert status_data["fail_count"] >= 1
        assert status_data["risk_score"] > 0.0

        # 4. Fetch Deterministic Findings with Exact Line Evidence
        findings_res = await client.get(f"/api/v1/analysis/{analysis_id}/findings")
        assert findings_res.status_code == 200
        findings = findings_res.json()
        assert len(findings) > 0

        # Locate CIS-1.2.1 finding (SSH Version 1 check)
        ssh_finding = next((f for f in findings if f["control_id"] == "CIS-1.2.1"), None)
        assert ssh_finding is not None, "CIS-1.2.1 must be evaluated"
        assert ssh_finding["status"] == "FAIL", "SSH version 1 must evaluate to FAIL"
        assert ssh_finding["severity"] in ["CRITICAL", "HIGH"]
        assert len(ssh_finding["evidence_lines"]) > 0

        # Verify exact line citation
        ssh_ev = ssh_finding["evidence_lines"][0]
        assert "ip ssh version 1" in ssh_ev["raw_text"]
        assert ssh_ev["line"] == 17

        # 5. Fetch Evidence Catalog
        evidence_res = await client.get(f"/api/v1/analysis/{analysis_id}/evidence")
        assert evidence_res.status_code == 200
        evidence_list = evidence_res.json()
        assert len(evidence_list) >= 5

        # Verify line 17 is in the evidence catalog
        line_17_evidence = next((e for e in evidence_list if e["line"] == 17), None)
        assert line_17_evidence is not None
        assert line_17_evidence["raw_text"] == "ip ssh version 1"

        # 6. Fetch Derived Risk Calculation
        risk_res = await client.get(f"/api/v1/analysis/{analysis_id}/risk")
        assert risk_res.status_code == 200
        risk_data = risk_res.json()

        assert risk_data["risk_score"] > 0.0
        assert risk_data["total_findings"] == status_data["fail_count"]
        assert "Calculated from" in risk_data["formula_breakdown"]
        assert len(risk_data["contributing_findings"]) == status_data["fail_count"]

        # 7. Fetch Raw Configuration
        config_res = await client.get(f"/api/v1/analysis/{analysis_id}/configuration")
        assert config_res.status_code == 200
        config_data = config_res.json()
        assert config_data["vendor"] == "cisco"
        assert len(config_data["lines"]) >= 35
        assert config_data["lines"][16]["line"] == 17
        assert "ip ssh version 1" in config_data["lines"][16]["text"]

        # 8. Re-Analysis: Remediate SSH Version (ip ssh version 1 -> ip ssh version 2)
        remediated_content = cisco_content.replace("ip ssh version 1", "ip ssh version 2")
        remediated_content = remediated_content.replace("no service password-encryption", "service password-encryption")
        remediated_content = remediated_content.replace("ip http server", "no ip http server")
        remediated_content = remediated_content.replace("service finger", "no service finger")

        reanalyze_payload = {
            "modified_content": remediated_content
        }
        reanalyze_res = await client.post(f"/api/v1/analysis/{analysis_id}/reanalyze", json=reanalyze_payload)
        assert reanalyze_res.status_code == 200, reanalyze_res.text
        reanalyze_data = reanalyze_res.json()

        assert reanalyze_data["status"] == "REANALYZED"
        assert reanalyze_data["new_fail_count"] < reanalyze_data["previous_fail_count"]
        assert "CIS-1.2.1" in reanalyze_data["resolved_controls"]

        # 9. Verify Post-Remediation Findings: CIS-1.2.1 is now PASS
        post_findings_res = await client.get(f"/api/v1/analysis/{analysis_id}/findings")
        assert post_findings_res.status_code == 200
        post_findings = post_findings_res.json()

        post_ssh_finding = next((f for f in post_findings if f["control_id"] == "CIS-1.2.1"), None)
        assert post_ssh_finding is not None
        assert post_ssh_finding["status"] == "PASS", "CIS-1.2.1 must now be PASS after real remediation"


@pytest.mark.asyncio
async def test_analysis_pipeline_error_handling():
    """Tests validation and edge cases for the analysis pipeline."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Empty content rejected
        empty_res = await client.post("/api/v1/analysis/ingest", json={"content": "   "})
        assert empty_res.status_code == 422 or empty_res.status_code == 400

        # Non-existent analysis ID returns 404
        non_res = await client.get("/api/v1/analysis/nonexistent-uuid-12345")
        assert non_res.status_code == 404

        # Non-existent reanalyze returns 404
        non_re_res = await client.post("/api/v1/analysis/nonexistent-uuid-12345/reanalyze", json={"modified_content": "hostname RTR"})
        assert non_re_res.status_code == 404

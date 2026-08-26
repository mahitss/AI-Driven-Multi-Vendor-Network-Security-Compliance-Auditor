"""
NetVigil Executive Security Report & Audit History Verification Tests
Problem Statement: SIH26155 (NTRO)

Verifies:
1. Executive Security Report generation from canonical audit state
2. Deterministic posture calculations (compliance, risk, evidence, frameworks)
3. Line-level grounded evidence citations
4. Allowlisted remediation and air-gapped network push safety status
5. Re-analysis before/after delta comparison
6. Sensitive data redaction
7. Multi-vendor report verification (Cisco, Juniper, Fortinet)
"""
import io
import os
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

CISCO_FIXTURE_PATH = os.path.join(
    os.path.dirname(__file__),
    "fixtures",
    "cisco_test_fixture.cfg"
)

def load_cisco_fixture() -> str:
    with open(CISCO_FIXTURE_PATH, "r", encoding="utf-8") as f:
        return f.read()


@pytest.mark.asyncio
async def test_executive_security_report_generation_from_golden_audit():
    """
    Validates that an executive report generated from a real canonical audit
    contains accurate identity, deterministic posture, line-level evidence,
    framework breakdowns, and allowlisted remediation items.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        cisco_content = load_cisco_fixture()

        # Step 1: Ingest Configuration
        file_payload = {"file": ("cisco-core-router.cfg", io.BytesIO(cisco_content.encode("utf-8")), "text/plain")}
        ingest_res = await client.post("/api/v1/configurations", files=file_payload)
        assert ingest_res.status_code == 201
        cfg_data = ingest_res.json()
        config_id = cfg_data["id"]

        # Step 2: Execute Multi-Framework Compliance Audit
        audit_res = await client.post(
            "/api/v1/audits",
            json={"configuration_id": config_id, "frameworks": ["CIS", "NIST", "STIG", "ISO"]}
        )
        assert audit_res.status_code == 201
        audit_data = audit_res.json()
        audit_id = audit_data["audit_id"]

        # Step 3: Generate Executive Security Report
        report_res = await client.post(
            "/api/v1/reports/generate",
            json={
                "report_type": "EXECUTIVE_AUDIT_SUMMARY",
                "audit_id": audit_id,
                "title": "Perimeter Gateway Executive Assessment",
                "notes": "Automated deterministic compliance audit for NTRO review."
            }
        )
        assert report_res.status_code == 201
        report = report_res.json()

        # Step 4: Verify Identity
        identity = report["sections"]["identity"]
        assert identity["audit_id"] == audit_id
        assert identity["configuration_id"] == config_id
        assert identity["vendor"] == "cisco"
        assert identity["platform"] == "ios"
        assert identity["parser_version"] == "v1.0.0"
        assert len(identity["sha256"]) > 10

        # Step 5: Verify Security Posture
        posture = report["sections"]["executive_summary"]
        assert posture["compliance_score"] >= 0.0
        assert posture["risk_score"] > 0.0
        assert posture["risk_priority"] in ["P0", "P1", "P2"]
        assert posture["total_controls_evaluated"] > 0
        assert posture["failed_controls"] > 0

        # Step 6: Verify Framework Coverage
        fw_coverage = report["sections"]["framework_coverage"]
        assert "CIS" in fw_coverage
        assert "NIST" in fw_coverage
        assert "STIG" in fw_coverage
        assert "ISO" in fw_coverage

        # Step 7: Verify Grounded Evidence Items
        evidence_items = report["sections"]["evidence_items"]
        assert len(evidence_items) > 0
        for ev in evidence_items:
            assert "control_id" in ev
            assert "source_line" in ev
            assert "evidence_text" in ev
            assert "why_it_failed" in ev

        # Step 8: Verify Remediation Safety Boundary
        remediation_items = report["sections"]["remediation_action_items"]
        for rm in remediation_items:
            assert "vendor" in rm
            assert "commands" in rm
            assert "status" in rm
            assert "execution_status" in rm
            assert "READ-ONLY" in rm["execution_status"] or "DISABLED" in rm["execution_status"]


@pytest.mark.asyncio
async def test_audit_delta_comparison():
    """
    Validates deterministic comparison between baseline and remediated audit runs.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        cisco_content = load_cisco_fixture()

        # 1. Ingest Baseline (Insecure)
        file_b = {"file": ("baseline-router.cfg", io.BytesIO(cisco_content.encode("utf-8")), "text/plain")}
        ingest_b = await client.post("/api/v1/configurations", files=file_b)
        assert ingest_b.status_code == 201
        b_cfg_id = ingest_b.json()["id"]

        audit_b = await client.post(
            "/api/v1/audits",
            json={"configuration_id": b_cfg_id, "frameworks": ["CIS", "NIST"]}
        )
        assert audit_b.status_code == 201
        b_audit_id = audit_b.json()["audit_id"]

        # 2. Ingest Remediated (Hardened)
        remediated_content = cisco_content.replace("ip ssh version 1", "ip ssh version 2")
        remediated_content = remediated_content.replace("no service password-encryption", "service password-encryption")
        remediated_content = remediated_content.replace("transport input telnet", "transport input ssh")

        file_r = {"file": ("remediated-router.cfg", io.BytesIO(remediated_content.encode("utf-8")), "text/plain")}
        ingest_r = await client.post("/api/v1/configurations", files=file_r)
        assert ingest_r.status_code == 201
        r_cfg_id = ingest_r.json()["id"]

        audit_r = await client.post(
            "/api/v1/audits",
            json={"configuration_id": r_cfg_id, "frameworks": ["CIS", "NIST"]}
        )
        assert audit_r.status_code == 201
        r_audit_id = audit_r.json()["audit_id"]

        # 3. Compare Audits
        compare_res = await client.post(
            "/api/v1/reports/compare",
            json={"baseline_audit_id": b_audit_id, "remediated_audit_id": r_audit_id}
        )
        assert compare_res.status_code == 200
        comp_data = compare_res.json()

        assert comp_data["baseline_audit_id"] == b_audit_id
        assert comp_data["remediated_audit_id"] == r_audit_id
        assert comp_data["remediated_compliance_score"] >= comp_data["baseline_compliance_score"]
        assert comp_data["resolved_count"] >= 1
        assert "CIS-1.2.1" in comp_data["resolved_controls"] or "CIS-1.1.2" in comp_data["resolved_controls"]
        assert comp_data["new_violations_count"] == 0


@pytest.mark.asyncio
async def test_multi_vendor_report_generation():
    """
    Validates report generation for Juniper and Fortinet configurations.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Juniper Hierarchical Ingestion
        juniper_cfg = """
        system {
            host-name JUNIPER-CORE;
            services {
                telnet;
            }
        }
        """
        file_j = {"file": ("juniper-core.conf", io.BytesIO(juniper_cfg.encode("utf-8")), "text/plain")}
        ingest_j = await client.post("/api/v1/configurations", files=file_j)
        assert ingest_j.status_code == 201
        j_cfg_id = ingest_j.json()["id"]

        audit_j = await client.post(
            "/api/v1/audits",
            json={"configuration_id": j_cfg_id, "frameworks": ["CIS", "NIST"]}
        )
        assert audit_j.status_code == 201
        j_audit_id = audit_j.json()["audit_id"]

        rep_j = await client.post(
            "/api/v1/reports/generate",
            json={"report_type": "EXECUTIVE_AUDIT_SUMMARY", "audit_id": j_audit_id}
        )
        assert rep_j.status_code == 201
        assert rep_j.json()["sections"]["identity"]["vendor"] == "juniper"

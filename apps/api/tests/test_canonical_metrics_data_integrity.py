"""
NetVigil RC1 — Canonical Metrics & Data Integrity Forensic Regression Test Suite
Problem Statement: SIH26155 (NTRO)

Validates:
1. Active Fleet Posture metrics vs. Cumulative Lifetime history.
2. Deduplication across repeated historical audit runs.
3. Accurate COUNT and AVG aggregations across latest audits.
4. Framework and Rule-to-Control mapping integrity.
5. Zero cross-audit contamination.
"""
import io
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.services.compliance.service import ComplianceAuditService
from app.services.risk.service import RiskIntelligenceService

SAMPLE_CISCO = """
!
version 15.0
hostname CORE-RTR-01
no service password-encryption
service finger
no ip http secure-server
ip http server
ip ssh version 1
enable password unencrypted
no aaa new-model
logging host 10.1.1.1
ntp server 10.1.1.2
line vty 0 4
 transport input telnet
 login
end
"""


@pytest.mark.asyncio
async def test_metrics_provenance_and_active_posture_aggregation(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Validates that /overview/stats and /risks/stats calculate active fleet posture
    based on the latest audit per configuration, preventing historical duplication.
    """
    # 1. Upload sample Cisco config
    files = {"file": ("core-rtr-01.cfg", io.BytesIO(SAMPLE_CISCO.encode("utf-8")), "text/plain")}
    upload_res = await client.post("/api/v1/configurations", files=files)
    assert upload_res.status_code == 201
    config_id = upload_res.json()["id"]

    # 2. Run first audit on config
    audit1, summary1, results1 = await ComplianceAuditService.run_audit(
        configuration_id=config_id,
        frameworks=["CIS", "NIST", "STIG", "ISO"],
        db=db_session,
    )
    risks1 = await RiskIntelligenceService.generate_audit_risks(audit1.id, db_session)

    # 3. Run a SECOND audit on the SAME configuration (simulating re-audit/history)
    audit2, summary2, results2 = await ComplianceAuditService.run_audit(
        configuration_id=config_id,
        frameworks=["CIS", "NIST", "STIG", "ISO"],
        db=db_session,
    )
    risks2 = await RiskIntelligenceService.generate_audit_risks(audit2.id, db_session)

    # Verify that total DB records have both audits
    total_audits = (await db_session.execute(select(func.count(Audit.id)).where(Audit.configuration_id == config_id))).scalar()
    assert total_audits == 2

    # 4. Query /overview/stats via API client
    res = await client.get("/api/v1/overview/stats")
    assert res.status_code == 200
    stats = res.json()

    # Active findings should match the LATEST audit count (60 rules evaluated), NOT 2x historical (120)
    assert stats["total_findings"] == len(results2)
    assert stats["compliance_score"] == pytest.approx(audit2.score, 0.1)
    assert stats["total_configurations"] >= 1
    assert stats["total_audits"] >= 2
    assert "lifetime_findings_evaluated" in stats
    assert stats["lifetime_findings_evaluated"] >= len(results1) + len(results2)

    # 5. Query /risks/stats via API client
    risk_res = await client.get("/api/v1/risks/stats")
    assert risk_res.status_code == 200
    risk_stats = risk_res.json()

    # Active risks should match the LATEST audit risk count, NOT 2x historical
    assert risk_stats["total_risks"] == len(risks2)
    assert risk_stats["average_risk_score"] > 0


@pytest.mark.asyncio
async def test_evidence_explorer_active_findings_scoping(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Validates that /audits/findings/all scopes to latest audit by default,
    eliminating duplicate historical CIS-1.1.1 findings for the same configuration.
    """
    # Upload config
    files = {"file": ("core-rtr-01.cfg", io.BytesIO(SAMPLE_CISCO.encode("utf-8")), "text/plain")}
    upload_res = await client.post("/api/v1/configurations", files=files)
    assert upload_res.status_code == 201
    config_id = upload_res.json()["id"]

    # Run audit 1
    audit1, _, _ = await ComplianceAuditService.run_audit(
        configuration_id=config_id,
        frameworks=["CIS"],
        db=db_session,
    )
    # Run audit 2
    audit2, _, _ = await ComplianceAuditService.run_audit(
        configuration_id=config_id,
        frameworks=["CIS"],
        db=db_session,
    )

    # Query with default latest_only=true
    res_latest = await client.get("/api/v1/audits/findings/all?framework=CIS")
    assert res_latest.status_code == 200
    latest_findings = res_latest.json()

    # CIS-1.1.1 should appear for audit2 (latest)
    cis_111_instances = [f for f in latest_findings if f["control_id"] == "CIS-1.1.1" and f["audit_id"] == audit2.id]
    assert len(cis_111_instances) == 1

    # Historical audit1 findings should NOT be in latest findings list
    audit1_in_latest = [f for f in latest_findings if f["audit_id"] == audit1.id]
    assert len(audit1_in_latest) == 0

    # Query with audit_id filter
    res_scoped = await client.get(f"/api/v1/audits/findings/all?audit_id={audit1.id}")
    assert res_scoped.status_code == 200
    scoped_findings = res_scoped.json()
    assert all(f["audit_id"] == audit1.id for f in scoped_findings)


@pytest.mark.asyncio
async def test_rule_vs_control_governance_integrity(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Validates that multiple technical rule evaluations mapping to the same
    Governance Control ID (e.g. ISO-A.13.1.1, NIST-CM-7) preserve line evidence and distinct rule IDs.
    """
    files = {"file": ("core-rtr-01.cfg", io.BytesIO(SAMPLE_CISCO.encode("utf-8")), "text/plain")}
    upload_res = await client.post("/api/v1/configurations", files=files)
    assert upload_res.status_code == 201
    config_id = upload_res.json()["id"]

    audit, summary, results = await ComplianceAuditService.run_audit(
        configuration_id=config_id,
        frameworks=["ISO", "NIST"],
        db=db_session,
    )

    # Check ISO-A.13.1.1 multiple technical checks
    iso_net_ctrls = [r for r in results if r.control_id == "ISO-A.13.1.1"]
    assert len(iso_net_ctrls) >= 2, "ISO-A.13.1.1 should have multiple distinct technical rule checks"
    rule_ids = {r.rule_id for r in iso_net_ctrls}
    assert len(rule_ids) == len(iso_net_ctrls), "Each rule check under the same control must have a unique rule_id"

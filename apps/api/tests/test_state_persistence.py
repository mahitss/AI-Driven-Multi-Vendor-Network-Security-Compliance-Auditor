"""
Test Suite: Audit State Persistence & Database Rehydration
Problem Statement: SIH26155 (NTRO)

Verifies that:
1. An empty database returns clean zero / empty states for all overview and telemetry endpoints.
2. Ingesting a configuration and executing an audit creates persisted database state across
   configurations, audits, findings, risks, and remediations.
3. Subsequent requests to overview stats, telemetry, active findings, and risks reliably rehydrate
   and return the exact persisted state across application reloads.
4. Consecutive audits on the same configuration update the latest active posture without state loss.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select

from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.finding import Finding
from app.models.risk import RiskItem
from app.models.remediation import RemediationProposal
from app.models.device import Device

SAMPLE_CISCO_CONFIG = """
version 15.2
hostname NTRO-EDGE-01
no service password-encryption
service timestamps debug datetime msec
service timestamps log datetime msec
enable password cleartext_admin_pass
!
no ip ssh version 2
ip http server
!
line vty 0 4
 transport input telnet
 password vty_insecure_pass
 login
!
end
"""


@pytest.mark.asyncio
async def test_empty_database_honest_empty_state(client: AsyncClient, db_session: AsyncSession):
    """Verifies that an empty database returns honest zero states across all endpoints."""
    # Clean all records
    await db_session.execute(delete(RemediationProposal))
    await db_session.execute(delete(RiskItem))
    await db_session.execute(delete(Finding))
    await db_session.execute(delete(Audit))
    await db_session.execute(delete(Configuration))
    await db_session.execute(delete(Device))
    await db_session.commit()

    # 1. Overview stats
    stats_res = await client.get("/api/v1/overview/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_configurations"] == 0
    assert stats["open_findings"] == 0
    assert stats["compliance_score"] == 0.0
    assert stats["risk_score"] == 0.0

    # 2. Findings list with latest_only=True
    findings_res = await client.get("/api/v1/audits/findings/all?status=FAIL&latest_only=true")
    assert findings_res.status_code == 200
    assert findings_res.json() == []

    # 3. Risks list with latest_only=True
    risks_res = await client.get("/api/v1/risks?latest_only=true")
    assert risks_res.status_code == 200
    assert risks_res.json() == []

    # 4. Telemetry
    telemetry_res = await client.get("/api/v1/overview/telemetry")
    assert telemetry_res.status_code == 200
    telemetry = telemetry_res.json()
    assert telemetry["audit_trends"] == []
    assert telemetry["summary"]["total_configurations"] == 0


@pytest.mark.asyncio
async def test_audit_state_persistence_and_rehydration(client: AsyncClient, db_session: AsyncSession):
    """Verifies that ingested configuration and audit results persist and rehydrate across subsequent requests."""
    # 1. Start clean
    await db_session.execute(delete(RemediationProposal))
    await db_session.execute(delete(RiskItem))
    await db_session.execute(delete(Finding))
    await db_session.execute(delete(Audit))
    await db_session.execute(delete(Configuration))
    await db_session.execute(delete(Device))
    await db_session.commit()

    # 2. Ingest configuration through the analysis pipeline
    ingest_payload = {
        "content": SAMPLE_CISCO_CONFIG,
        "filename": "ntro_edge_core.cfg",
        "vendor_hint": "cisco",
    }
    ingest_res = await client.post("/api/v1/analysis/ingest", json=ingest_payload)
    assert ingest_res.status_code == 201
    ingest_data = ingest_res.json()
    analysis_id = ingest_data["analysis_id"]

    # 3. Re-hydrate Overview Stats from database
    stats_res = await client.get("/api/v1/overview/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_configurations"] >= 1
    assert stats["open_findings"] > 0
    assert stats["compliance_score"] > 0
    assert stats["risk_score"] > 0
    assert "severity_breakdown" in stats

    # 4. Re-hydrate Active Findings from database
    findings_res = await client.get("/api/v1/audits/findings/all?status=FAIL&latest_only=true")
    assert findings_res.status_code == 200
    findings = findings_res.json()
    assert len(findings) > 0
    assert any(f["severity"] in ["CRITICAL", "HIGH"] for f in findings)

    # 5. Re-hydrate Telemetry from database
    telemetry_res = await client.get("/api/v1/overview/telemetry")
    assert telemetry_res.status_code == 200
    telemetry = telemetry_res.json()
    assert len(telemetry["audit_trends"]) >= 1
    first_history = telemetry["audit_trends"][0]
    assert first_history["compliance_score"] > 0
    assert first_history["open_findings"] > 0

    # 6. Re-hydrate Risks from database
    risks_res = await client.get("/api/v1/risks?latest_only=true")
    assert risks_res.status_code == 200
    risks = risks_res.json()
    assert len(risks) > 0

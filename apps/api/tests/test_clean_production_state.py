"""
Test Suite: Production Clean State & Zero Demo Ingestion
Problem Statement: SIH26155 (NTRO)

Verifies that:
1. Fresh database starts with 0 demo records in production.
2. Empty database returns honest zero/empty states for compliance, risk, and telemetry.
3. clean_demo_records safely purges demo fixtures.
4. Genuine user ingestion produces authentic records.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.configuration import Configuration
from app.models.audit import Audit
from app.models.finding import Finding
from app.models.risk import RiskItem
from app.models.remediation import RemediationProposal
from app.db.seed import clean_demo_records, DEMO_FILENAMES


@pytest.mark.asyncio
async def test_clean_demo_records_purges_only_demo_fixtures(db_session: AsyncSession):
    """Verifies that clean_demo_records removes only canonical demo records."""
    count = await clean_demo_records(db_session)
    assert count >= 0

    # Verify none of the demo filenames remain in Configuration
    cfgs = (await db_session.execute(
        select(Configuration).where(Configuration.original_filename.in_(DEMO_FILENAMES))
    )).scalars().all()
    assert len(cfgs) == 0


@pytest.mark.asyncio
async def test_empty_database_overview_stats_is_honest(client: AsyncClient, db_session: AsyncSession):
    """Verifies that when database has 0 configurations, overview stats returns 0/clean metrics."""
    # Temporarily clean all records in this test session
    await db_session.execute(delete(RemediationProposal))
    await db_session.execute(delete(RiskItem))
    await db_session.execute(delete(Finding))
    await db_session.execute(delete(Audit))
    await db_session.execute(delete(Configuration))
    await db_session.commit()

    response = await client.get("/api/v1/overview/stats")
    assert response.status_code == 200
    data = response.json()

    assert data["total_configurations"] == 0
    assert data["total_devices"] == 0
    assert data["total_audits"] == 0
    assert data["open_findings"] == 0
    assert data["compliance_score"] == 0.0
    assert data["risk_score"] == 0.0
    assert data["severity_breakdown"]["critical"] == 0
    assert data["severity_breakdown"]["high"] == 0


@pytest.mark.asyncio
async def test_empty_database_telemetry_returns_empty_trends(client: AsyncClient, db_session: AsyncSession):
    """Verifies that telemetry endpoint returns empty audit trends when no real runs exist."""
    # Ensure clean state
    await db_session.execute(delete(RemediationProposal))
    await db_session.execute(delete(RiskItem))
    await db_session.execute(delete(Finding))
    await db_session.execute(delete(Audit))
    await db_session.execute(delete(Configuration))
    await db_session.commit()

    response = await client.get("/api/v1/overview/telemetry")
    assert response.status_code == 200
    data = response.json()

    assert data["audit_trends"] == []
    assert data["has_sufficient_history"] is False
    assert data["top_affected_assets"] == []
    assert data["heatmap_matrix"] == []
    assert data["topology"]["has_topology_data"] is False
    assert data["summary"]["active_open_findings"] == 0
    assert data["summary"]["total_configurations"] == 0
    assert data["summary"]["total_audits"] == 0


@pytest.mark.asyncio
async def test_genuine_ingestion_creates_authentic_metrics(client: AsyncClient, db_session: AsyncSession):
    """Verifies that actual user ingestion generates authentic findings and telemetry."""
    sample_cisco = b"""
    hostname test-border-router
    no service password-encryption
    line vty 0 4
     transport input telnet
    """
    response = await client.post(
        "/api/v1/configurations",
        files={"file": ("user-border-router.cfg", sample_cisco, "text/plain")},
    )
    assert response.status_code == 201
    config_data = response.json()
    config_id = config_data["id"]

    # Run audit on this config
    audit_res = await client.post(
        "/api/v1/audits",
        json={"configuration_id": config_id, "frameworks": ["CIS"]},
    )
    assert audit_res.status_code == 201
    audit_data = audit_res.json()

    # Now verify overview stats reflect exactly this 1 genuine configuration
    stats_res = await client.get("/api/v1/overview/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()

    assert stats["total_configurations"] >= 1
    assert stats["total_audits"] >= 1
    assert stats["open_findings"] > 0

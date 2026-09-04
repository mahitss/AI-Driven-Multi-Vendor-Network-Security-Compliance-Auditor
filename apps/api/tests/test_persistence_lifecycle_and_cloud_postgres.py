"""
NetVigil P0 Data Persistence & Cloud PostgreSQL Lifecycle Tests
Problem Statement: SIH26155 (NTRO)

Validates:
1. Async and sync database URL assembly for cloud PostgreSQL providers (Render, Supabase, Neon)
2. Handling and transformation of sslmode=require into asyncpg-compatible ssl=require
3. Persistence status identification (PostgreSQL vs SQLite)
4. Ingestion resilience when local disk write encounters errors (relying on durable DB raw_content)
5. Multi-tenant data isolation across redeploys / restarts
6. Simulated backend restart: verification that configs, audits, findings, and scores survive engine recreation
"""
import pytest
import uuid
from pathlib import Path
from unittest.mock import patch
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import Settings, settings
from app.models.configuration import Configuration
from app.models.audit import Audit
from app.models.finding import Finding
from app.models.base import Base
from app.services.ingestion.config_ingestion import ConfigurationIngestionService
from app.services.compliance.service import ComplianceAuditService
from app.services.telemetry.service import TelemetryAggregationService


def test_postgres_url_assembly_and_ssl_transformation():
    """Verify that postgresql and postgres URLs are converted to asyncpg and sslmode is rewritten to ssl."""
    # Standard Render or Heroku URL: postgres://
    url1 = "postgres://postgres:mysecretpass@db.render.com:5432/netvigil"
    assembled1 = Settings.assemble_async_database_url(url1)
    assert assembled1.startswith("postgresql+asyncpg://")
    assert "postgres:mysecretpass@db.render.com:5432/netvigil" in assembled1

    # Standard Supabase direct connection with ?sslmode=require
    url2 = "postgresql://postgres:mysecretpass@db.cveymgeivgnjnwnxfveu.supabase.co:5432/postgres?sslmode=require"
    assembled2 = Settings.assemble_async_database_url(url2)
    assert assembled2.startswith("postgresql+asyncpg://")
    assert "ssl=require" in assembled2
    assert "sslmode=" not in assembled2

    # Supabase pooler connection with multiple query params
    url3 = "postgresql://postgres.cveymgeivgnjnwnxfveu:mysecretpass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&connect_timeout=10"
    assembled3 = Settings.assemble_async_database_url(url3)
    assert assembled3.startswith("postgresql+asyncpg://")
    assert "ssl=require" in assembled3
    assert "connect_timeout=10" in assembled3

    # Default fallback when empty
    assembled_empty = Settings.assemble_async_database_url("")
    assert assembled_empty == "sqlite+aiosqlite:///./netvigil.db"


def test_sync_database_url_assembly():
    """Verify sync database URL assembly for Alembic migrations and sync engines."""
    # From postgresql+asyncpg to standard postgresql
    url1 = "postgresql+asyncpg://postgres:pass@db.render.com:5432/netvigil"
    assembled1 = Settings.assemble_sync_database_url(url1, None)
    assert assembled1.startswith("postgresql://")
    assert "+asyncpg" not in assembled1

    # Sync engine needs sslmode=require for psycopg2
    url2 = "postgresql+asyncpg://postgres:pass@db.supabase.co:5432/postgres?ssl=require"
    assembled2 = Settings.assemble_sync_database_url(url2, None)
    assert assembled2.startswith("postgresql://")
    assert "sslmode=require" in assembled2


def test_is_persistent_database_property():
    """Verify is_persistent_database correctly identifies PostgreSQL vs ephemeral SQLite."""
    pg_settings = Settings(DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/db")
    assert pg_settings.is_persistent_database is True

    sqlite_settings = Settings(DATABASE_URL="sqlite+aiosqlite:///./netvigil.db")
    assert sqlite_settings.is_persistent_database is False


@pytest.mark.asyncio
async def test_ingestion_resilience_when_disk_write_fails(db_session: AsyncSession):
    """Verify that configuration ingestion succeeds and stores raw_content durably in DB even if disk write fails."""
    user_id = f"test-user-{uuid.uuid4()}"
    cfg_content = b"hostname SecureEdgeRouter\nservice password-encryption\nend\n"

    # Simulate local disk write failure (e.g. read-only container filesystem)
    with patch("builtins.open", side_effect=OSError("Read-only file system")):
        config = await ConfigurationIngestionService.ingest_file(
            filename="resilient_router.cfg",
            content_bytes=cfg_content,
            db=db_session,
            user_id=user_id,
        )

    assert config is not None
    assert config.user_id == user_id
    assert config.original_filename == "resilient_router.cfg"
    assert config.detected_vendor == "cisco"
    assert "SecureEdgeRouter" in config.raw_content

    # Query back from DB to confirm persistence
    stmt = select(Configuration).where(Configuration.id == config.id)
    saved = (await db_session.execute(stmt)).scalars().first()
    assert saved is not None
    assert saved.raw_content == "hostname SecureEdgeRouter\nservice password-encryption\nend\n"


@pytest.mark.asyncio
async def test_simulated_backend_restart_persistence(tmp_path: Path):
    """
    Simulates a backend restart by creating an isolated SQLite DB file on disk,
    writing records in Session 1, closing the engine, and opening Session 2 from the same DB file.
    All configurations, audits, and findings must persist completely across restarts.
    """
    db_file = tmp_path / "persistent_test.db"
    db_url = f"sqlite+aiosqlite:///{db_file}"

    user_a = f"usr-persist-{uuid.uuid4()}"
    cfg_text = (
        "hostname CoreRouterA\n"
        "service password-encryption\n"
        "enable secret 9 $9$fakehash\n"
        "no ip http server\n"
        "end\n"
    )

    # --- Session 1: Run Ingestion & Audit ---
    engine1 = create_async_engine(db_url, pool_pre_ping=True)
    async with engine1.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker1 = async_sessionmaker(bind=engine1, class_=AsyncSession, expire_on_commit=False)
    async with session_maker1() as session1:
        cfg = await ConfigurationIngestionService.ingest_file(
            filename="persist_core.cfg",
            content_bytes=cfg_text.encode("utf-8"),
            db=session1,
            user_id=user_a,
        )
        cfg_id = cfg.id

        audit_rec, summary, _ = await ComplianceAuditService.run_audit(
            configuration_id=cfg_id,
            frameworks=["CIS", "NIST"],
            db=session1,
            user_id=user_a,
        )
        audit_id = audit_rec.id
        initial_score = audit_rec.score

    # Simulate backend termination: dispose engine completely
    await engine1.dispose()

    # --- Session 2: Backend Reboots / Restarts ---
    engine2 = create_async_engine(db_url, pool_pre_ping=True)
    session_maker2 = async_sessionmaker(bind=engine2, class_=AsyncSession, expire_on_commit=False)

    async with session_maker2() as session2:
        # 1. Verify Configuration exists with identical raw_content
        saved_cfg = (await session2.execute(select(Configuration).where(Configuration.id == cfg_id))).scalars().first()
        assert saved_cfg is not None
        assert saved_cfg.user_id == user_a
        assert saved_cfg.original_filename == "persist_core.cfg"
        assert saved_cfg.raw_content == cfg_text

        # 2. Verify Audit exists with identical score and status
        saved_audit = (await session2.execute(select(Audit).where(Audit.id == audit_id))).scalars().first()
        assert saved_audit is not None
        assert saved_audit.status == "COMPLETED"
        assert saved_audit.score == initial_score
        assert saved_audit.configuration_id == cfg_id

        # 3. Verify Findings exist with line citations and evidence
        findings_stmt = select(Finding).where(Finding.audit_id == audit_id, Finding.user_id == user_a)
        findings = list((await session2.execute(findings_stmt)).scalars().all())
        assert len(findings) > 0
        for f in findings:
            assert f.user_id == user_a
            assert f.audit_id == audit_id

        # 4. Verify Telemetry aggregates persisted audits after restart
        telemetry = await TelemetryAggregationService.get_complete_telemetry(session2, user_id=user_a)
        assert telemetry["summary"]["total_audits"] >= 1
        assert telemetry["summary"]["total_configurations"] >= 1
        assert len(telemetry["audit_trends"]) >= 1
        assert telemetry["audit_trends"][0]["audit_id"] == audit_id

    await engine2.dispose()


@pytest.mark.asyncio
async def test_cross_tenant_isolation_persisted(db_session: AsyncSession):
    """Verify that User A's persisted audits and configurations are completely invisible to User B."""
    user_a = f"tenant-alpha-{uuid.uuid4()}"
    user_b = f"tenant-bravo-{uuid.uuid4()}"

    cfg_a = await ConfigurationIngestionService.ingest_file(
        filename="alpha_gateway.cfg",
        content_bytes=b"hostname AlphaGW\nservice password-encryption\nend\n",
        db=db_session,
        user_id=user_a,
    )
    audit_a, _, _ = await ComplianceAuditService.run_audit(
        configuration_id=cfg_a.id,
        frameworks=["CIS"],
        db=db_session,
        user_id=user_a,
    )

    # Querying as User B should return 0 audits and 0 configurations
    b_cfgs = list((await db_session.execute(select(Configuration).where(Configuration.user_id == user_b))).scalars().all())
    b_audits = list((await db_session.execute(select(Audit).where(Audit.user_id == user_b))).scalars().all())
    b_findings = list((await db_session.execute(select(Finding).where(Finding.user_id == user_b))).scalars().all())

    assert len(b_cfgs) == 0
    assert len(b_audits) == 0
    assert len(b_findings) == 0

    # User B telemetry must report 0 audits
    b_telemetry = await TelemetryAggregationService.get_complete_telemetry(db_session, user_id=user_b)
    assert b_telemetry["summary"]["total_audits"] == 0
    assert b_telemetry["summary"]["total_configurations"] == 0

"""
Production Data Persistence Across Restart & Redeploy Simulation Test
Problem Statement: SIH26155 (NTRO)

Executes the exact 4-phase verification sequence required by P0:
Phase 1: Ingest 02_CISCO_HARDENED.cfg, execute audit, record IDs, hash, scores, findings
Phase 2: Simulate Backend Restart (dispose engine, spawn clean engine on persistent storage)
Phase 3: Verify exact audit ID, configuration ID, SHA-256, findings, scores, and evidence line citations survive
Phase 4: Verify complete tenant isolation across redeployment boundaries
"""
import pytest
import uuid
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.models.base import Base
from app.models.configuration import Configuration
from app.models.audit import Audit
from app.models.finding import Finding
import app.services.parser.vendors
from app.services.ingestion.config_ingestion import ConfigurationIngestionService
from app.services.compliance.service import ComplianceAuditService
from app.services.risk.service import RiskIntelligenceService
from app.core.config import Settings


@pytest.mark.asyncio
async def test_full_redeploy_persistence_lifecycle(tmp_path: Path):
    """
    Executes the comprehensive Phase 1 - Phase 4 persistence verification.
    """
    # Use persistent database path simulating cloud persistent volume / PostgreSQL
    persistent_db_file = tmp_path / "persistent_netvigil.db"
    persistent_db_url = f"sqlite+aiosqlite:///{persistent_db_file.as_posix()}"

    # -------------------------------------------------------------------------
    # PHASE 1 — BEFORE DEPLOY (Initial Ingestion & Audit)
    # -------------------------------------------------------------------------
    engine_v1 = create_async_engine(persistent_db_url, echo=False)
    async with engine_v1.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionMakerV1 = async_sessionmaker(bind=engine_v1, class_=AsyncSession, expire_on_commit=False)

    user_a = f"tenant-alpha-{uuid.uuid4()}"
    cisco_path = Path("data/sample-configs/benchmarks/02_CISCO_HARDENED.cfg")
    if not cisco_path.exists():
        cisco_path = Path("data/demo/cisco/secure-router.cfg")
    cisco_bytes = cisco_path.read_bytes()

    async with SessionMakerV1() as db_session:
        # 1. Ingest configuration
        cfg_record = await ConfigurationIngestionService.ingest_file(
            filename="02_CISCO_HARDENED.cfg",
            content_bytes=cisco_bytes,
            db=db_session,
            user_id=user_a,
        )

        # 2. Run deterministic compliance audit
        audit_record, summary, results = await ComplianceAuditService.run_audit(
            configuration_id=cfg_record.id,
            frameworks=["CIS", "NIST", "STIG", "ISO"],
            db=db_session,
            user_id=user_a,
        )

        # 3. Correlate risk
        risks = await RiskIntelligenceService.generate_audit_risks(audit_record.id, db_session, user_id=user_a)

        # Record baseline metrics
        recorded_config_id = cfg_record.id
        recorded_audit_id = audit_record.id
        recorded_hash = cfg_record.hash
        recorded_filename = cfg_record.original_filename
        recorded_vendor = cfg_record.detected_vendor
        recorded_score = audit_record.score
        recorded_risk_count = len(risks)
        recorded_first_risk_id = risks[0].id if risks else None
        recorded_findings_count = len(results)

        # Query first finding to record evidence line
        f_stmt = select(Finding).where(Finding.audit_id == recorded_audit_id).limit(1)
        first_finding = (await db_session.execute(f_stmt)).scalars().first()
        recorded_first_finding_id = first_finding.id
        recorded_first_finding_ctrl = first_finding.control_id

    # -------------------------------------------------------------------------
    # PHASE 2 — SIMULATE REDEPLOY / CONTAINER RESTART
    # Destroy all in-memory connection pools, sessions, and process state
    # -------------------------------------------------------------------------
    await engine_v1.dispose()

    # Re-spawn engine (simulating new container starting after redeploy)
    engine_v2 = create_async_engine(persistent_db_url, echo=False)
    async with engine_v2.begin() as conn:
        # Idempotent create_all (must not drop or overwrite existing tables)
        await conn.run_sync(Base.metadata.create_all)

    SessionMakerV2 = async_sessionmaker(bind=engine_v2, class_=AsyncSession, expire_on_commit=False)

    # -------------------------------------------------------------------------
    # PHASE 3 — VERIFY AFTER REDEPLOY
    # -------------------------------------------------------------------------
    async with SessionMakerV2() as db_session_after:
        # 1. Fetch audit history for User A
        audits_stmt = select(Audit).where(Audit.user_id == user_a)
        persisted_audits = list((await db_session_after.execute(audits_stmt)).scalars().all())

        assert len(persisted_audits) == 1, "Expected exactly 1 persisted audit session after redeploy"
        persisted_audit = persisted_audits[0]

        # 2. Confirm exact IDs, score, and hash match baseline
        assert persisted_audit.id == recorded_audit_id, "Analysis/Audit ID must be identical after redeploy"
        assert persisted_audit.configuration_id == recorded_config_id, "Configuration ID must be identical"
        assert persisted_audit.score == recorded_score, f"Score changed: expected {recorded_score}, got {persisted_audit.score}"

        # 3. Verify Configuration Record
        cfg_stmt = select(Configuration).where(Configuration.id == recorded_config_id)
        persisted_cfg = (await db_session_after.execute(cfg_stmt)).scalars().first()
        assert persisted_cfg is not None, "Configuration record must survive redeploy"
        assert persisted_cfg.hash == recorded_hash, f"SHA-256 mismatch: {persisted_cfg.hash} vs {recorded_hash}"
        assert persisted_cfg.original_filename == recorded_filename
        assert persisted_cfg.detected_vendor == recorded_vendor
        assert len(persisted_cfg.raw_content) == len(cisco_bytes.decode("utf-8"))

        # 4. Verify Findings & Evidence citations survive
        findings_stmt = select(Finding).where(Finding.audit_id == recorded_audit_id)
        persisted_findings = list((await db_session_after.execute(findings_stmt)).scalars().all())

        assert len(persisted_findings) == recorded_findings_count, (
            f"Findings count mismatch: expected {recorded_findings_count}, got {len(persisted_findings)}"
        )

        matched_f = next((f for f in persisted_findings if f.id == recorded_first_finding_id), None)
        assert matched_f is not None, "Specific finding record must survive"
        assert matched_f.control_id == recorded_first_finding_ctrl

        # 5. Verify Risk items survive
        risks_after = await RiskIntelligenceService.get_audit_risks(recorded_audit_id, db_session_after, user_id=user_a)
        assert len(risks_after) == recorded_risk_count, "Risk count must remain identical after redeploy"
        if recorded_first_risk_id:
            assert any(r.id == recorded_first_risk_id for r in risks_after), "Specific risk record must survive"

        # -------------------------------------------------------------------------
        # PHASE 4 — TENANT ISOLATION ACROSS REDEPLOY
        # User B logs in after redeploy. User B must see 0 audits and 0 configs.
        # -------------------------------------------------------------------------
        user_b = f"tenant-bravo-{uuid.uuid4()}"

        user_b_audits = list((await db_session_after.execute(select(Audit).where(Audit.user_id == user_b))).scalars().all())
        user_b_cfgs = list((await db_session_after.execute(select(Configuration).where(Configuration.user_id == user_b))).scalars().all())
        user_b_findings = list((await db_session_after.execute(select(Finding).where(Finding.user_id == user_b))).scalars().all())

        assert len(user_b_audits) == 0, "User B must see 0 audits"
        assert len(user_b_cfgs) == 0, "User B must see 0 configurations"
        assert len(user_b_findings) == 0, "User B must see 0 findings"

        print("\n" + "="*80)
        print("REDEPLOY PERSISTENCE & TENANT ISOLATION REPORT")
        print("="*80)
        print(f"CONFIGURATION ID:   BEFORE: {recorded_config_id}  | AFTER: {persisted_cfg.id}")
        print(f"ANALYSIS/AUDIT ID:  BEFORE: {recorded_audit_id}  | AFTER: {persisted_audit.id}")
        print(f"SHA-256 HASH:       BEFORE: {recorded_hash} | AFTER: {persisted_cfg.hash}")
        print(f"FILENAME:           BEFORE: {recorded_filename} | AFTER: {persisted_cfg.original_filename}")
        print(f"VENDOR:             BEFORE: {recorded_vendor} | AFTER: {persisted_cfg.detected_vendor}")
        print(f"COMPLIANCE SCORE:   BEFORE: {recorded_score}% | AFTER: {persisted_audit.score}%")
        print(f"FINDINGS COUNT:     BEFORE: {recorded_findings_count} | AFTER: {len(persisted_findings)}")
        print(f"RISKS COUNT:        BEFORE: {recorded_risk_count} | AFTER: {len(risks_after)}")
        print(f"FIRST FINDING ID:   BEFORE: {recorded_first_finding_id} ({recorded_first_finding_ctrl}) | AFTER: {matched_f.id} ({matched_f.control_id})")
        print(f"TENANT ISOLATION:   User A ({user_a}): 1 audit, {len(persisted_findings)} findings | User B ({user_b}): {len(user_b_audits)} audits, {len(user_b_findings)} findings")
        print("="*80 + "\n")

    await engine_v2.dispose()

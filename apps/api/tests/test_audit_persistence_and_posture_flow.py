"""
Regression Test Suite: Audit Persistence & Security Posture Data Flow
Verifies Requirements:
1. Security Posture with one completed audit shows non-zero real metrics.
2. Security Posture with multiple different assets aggregates correctly.
3. Repeated audits of the same asset are not double-counted (latest completed scan used).
4. PASS findings are excluded from open findings.
5. NOT_APPLICABLE findings are excluded from open findings.
6. Only active FAIL CRITICAL findings count toward critical findings.
7. Posture is strictly tenant-scoped (no cross-tenant leakage).
8. Zero completed audits returns genuine empty state.
9. Completed audits without telemetry still render valid overview stats.
10. Audit summary and selected audit use authoritative matching ID.
"""
import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.configuration import Configuration
from app.models.audit import Audit
from app.models.finding import Finding
from app.api.routes.overview import get_system_overview_stats
from app.core.auth import AuthenticatedUser
from app.core.config import settings
import jwt


def _create_test_jwt(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "exp": int(datetime.now(timezone.utc).timestamp()) + 7200,
    }
    key = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY or "netvigil-secure-test-jwt-secret-key-32b"
    return jwt.encode(payload, key, algorithm="HS256")


async def _create_test_user(db: AsyncSession, email: str, name: str) -> tuple[User, dict[str, str]]:
    u = User(
        id=str(uuid.uuid4()),
        email=email,
        name=name,
        role="analyst",
    )
    db.add(u)
    await db.commit()
    token = _create_test_jwt(u.id, u.email)
    return u, {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_posture_single_completed_audit_shows_real_metrics(db_session: AsyncSession):
    """TEST 1 & 5: Security Posture with one completed audit shows non-zero real metrics."""
    user, _ = await _create_test_user(db_session, "single_audit@netvigil.io", "Single User")

    cfg = Configuration(
        user_id=user.id,
        filename="cisco_edge.cfg",
        original_filename="cisco_edge.cfg",
        storage_path="mock/cisco_edge.cfg",
        file_size_bytes=200,
        hash="hash_cisco_edge_1",
        detected_vendor="cisco",
        detected_platform="ios",
        parser_status="parsed",
        raw_content="hostname EDGE-01\n",
    )
    db_session.add(cfg)
    await db_session.flush()

    audit = Audit(
        user_id=user.id,
        configuration_id=cfg.id,
        status="COMPLETED",
        score=53.3,
        summary_stats={"framework_scores": {"CIS": {"score": 53.3}}},
    )
    db_session.add(audit)
    await db_session.flush()

    # Add 1 FAIL CRITICAL, 1 FAIL HIGH, 1 PASS, 1 NOT_APPLICABLE
    f_crit = Finding(
        user_id=user.id,
        audit_id=audit.id,
        framework="CIS",
        control_id="CIS-1.1.1",
        category="Access Control",
        status="FAIL",
        severity="CRITICAL",
        title="Telnet Active",
    )
    f_high = Finding(
        user_id=user.id,
        audit_id=audit.id,
        framework="CIS",
        control_id="CIS-1.1.2",
        category="Access Control",
        status="FAIL",
        severity="HIGH",
        title="Weak Enable Secret",
    )
    f_pass = Finding(
        user_id=user.id,
        audit_id=audit.id,
        framework="CIS",
        control_id="CIS-1.1.3",
        category="Access Control",
        status="PASS",
        severity="CRITICAL",  # PASS finding with CRITICAL severity must NOT count toward open or critical findings
        title="SSH Enabled",
    )
    f_na = Finding(
        user_id=user.id,
        audit_id=audit.id,
        framework="CIS",
        control_id="CIS-1.1.4",
        category="Access Control",
        status="NOT_APPLICABLE",
        severity="CRITICAL",  # N/A finding must NOT count toward open or critical findings
        title="BGP Unused",
    )
    db_session.add_all([f_crit, f_high, f_pass, f_na])
    await db_session.commit()

    # Evaluate overview stats
    auth_u = AuthenticatedUser(id=user.id, email=user.email, role="analyst")
    stats = await get_system_overview_stats(db=db_session, current_user=auth_u)

    assert stats["compliance_score"] == 53.3
    assert stats["managed_assets"] == 1
    assert stats["total_configurations"] >= 1
    assert stats["total_audits"] == 1
    # Strict exclusion: PASS and NOT_APPLICABLE are excluded
    assert stats["open_findings"] == 2  # Only FAIL CRITICAL + FAIL HIGH
    assert stats["severity_breakdown"]["critical"] == 1  # Only active FAIL CRITICAL
    assert stats["severity_breakdown"]["high"] == 1
    assert stats["latest_audit"] is not None
    assert stats["latest_audit"]["id"] == audit.id
    assert stats["latest_audit"]["score"] == 53.3


@pytest.mark.asyncio
async def test_repeated_audits_same_asset_deduplicated_not_double_counted(db_session: AsyncSession):
    """TEST 2 & 7: Repeated audits of the same asset are not double-counted (latest scan used)."""
    user, _ = await _create_test_user(db_session, "repeat_audit@netvigil.io", "Repeat User")

    cfg = Configuration(
        user_id=user.id,
        filename="juniper_fw.conf",
        original_filename="juniper_fw.conf",
        storage_path="mock/juniper_fw.conf",
        file_size_bytes=200,
        hash="hash_juniper_fw",
        detected_vendor="juniper",
        detected_platform="junos",
        parser_status="parsed",
        raw_content="version 21.4;\n",
    )
    db_session.add(cfg)
    await db_session.flush()

    # Scan 1: Old audit at 10:00 with score 30.0%
    audit_old = Audit(
        user_id=user.id,
        configuration_id=cfg.id,
        status="COMPLETED",
        score=30.0,
        created_at=datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc),
    )
    db_session.add(audit_old)
    await db_session.flush()

    f_old = Finding(
        user_id=user.id,
        audit_id=audit_old.id,
        framework="CIS",
        control_id="CIS-OLD-1",
        status="FAIL",
        severity="HIGH",
        title="Old Finding",
    )
    db_session.add(f_old)

    # Scan 2: Latest audit at 12:00 with score 60.0%
    audit_new = Audit(
        user_id=user.id,
        configuration_id=cfg.id,
        status="COMPLETED",
        score=60.0,
        created_at=datetime(2026, 9, 1, 12, 0, 0, tzinfo=timezone.utc),
    )
    db_session.add(audit_new)
    await db_session.flush()

    f_new = Finding(
        user_id=user.id,
        audit_id=audit_new.id,
        framework="CIS",
        control_id="CIS-NEW-1",
        status="FAIL",
        severity="CRITICAL",
        title="New Finding",
    )
    db_session.add(f_new)
    await db_session.commit()

    auth_u = AuthenticatedUser(id=user.id, email=user.email, role="analyst")
    stats = await get_system_overview_stats(db=db_session, current_user=auth_u)

    # Total audit runs is 2, but managed assets is 1 (deduplicated)
    assert stats["total_audits"] == 2
    assert stats["managed_assets"] == 1
    # Compliance score must be latest audit (60.0), NOT average of old and new (45.0)
    assert stats["compliance_score"] == 60.0
    # Active findings must only count from the latest audit (f_new), not f_old
    assert stats["open_findings"] == 1
    assert stats["severity_breakdown"]["critical"] == 1
    assert stats["severity_breakdown"]["high"] == 0
    assert stats["latest_audit"]["id"] == audit_new.id


@pytest.mark.asyncio
async def test_multiple_assets_fleet_aggregation(db_session: AsyncSession):
    """TEST 3 & 6: Multiple different assets aggregate correctly across the fleet."""
    user, _ = await _create_test_user(db_session, "fleet_agg@netvigil.io", "Fleet User")

    # Asset A: Cisco (Score 40.0)
    cfg_a = Configuration(
        user_id=user.id,
        filename="cisco_core.cfg",
        original_filename="cisco_core.cfg",
        storage_path="mock/cisco_core.cfg",
        file_size_bytes=100,
        hash="hash_cisco_core",
        detected_vendor="cisco",
        parser_status="parsed",
        raw_content="hostname CORE\n",
    )
    # Asset B: Fortinet (Score 60.0)
    cfg_b = Configuration(
        user_id=user.id,
        filename="fortinet_edge.conf",
        original_filename="fortinet_edge.conf",
        storage_path="mock/fortinet_edge.conf",
        file_size_bytes=100,
        hash="hash_fortinet_edge",
        detected_vendor="fortinet",
        parser_status="parsed",
        raw_content="config system global\nend\n",
    )
    db_session.add_all([cfg_a, cfg_b])
    await db_session.flush()

    audit_a = Audit(
        user_id=user.id,
        configuration_id=cfg_a.id,
        status="COMPLETED",
        score=40.0,
    )
    audit_b = Audit(
        user_id=user.id,
        configuration_id=cfg_b.id,
        status="COMPLETED",
        score=60.0,
    )
    db_session.add_all([audit_a, audit_b])
    await db_session.flush()

    # Findings
    f_a = Finding(user_id=user.id, audit_id=audit_a.id, framework="CIS", control_id="C-1", status="FAIL", severity="HIGH", title="A1")
    f_b = Finding(user_id=user.id, audit_id=audit_b.id, framework="CIS", control_id="F-1", status="FAIL", severity="CRITICAL", title="B1")
    db_session.add_all([f_a, f_b])
    await db_session.commit()

    auth_u = AuthenticatedUser(id=user.id, email=user.email, role="analyst")
    stats = await get_system_overview_stats(db=db_session, current_user=auth_u)

    # 2 distinct assets
    assert stats["managed_assets"] == 2
    assert stats["total_configurations"] >= 2
    # Fleet compliance = (40.0 + 60.0) / 2 = 50.0%
    assert stats["compliance_score"] == 50.0
    assert stats["open_findings"] == 2
    assert stats["severity_breakdown"]["critical"] == 1
    assert stats["severity_breakdown"]["high"] == 1


@pytest.mark.asyncio
async def test_tenant_isolation_posture(db_session: AsyncSession):
    """TEST 4 & 11: Posture is strictly tenant-scoped (User A cannot see User B's audits)."""
    user_a, _ = await _create_test_user(db_session, "tenant_a@netvigil.io", "Tenant A")
    user_b, _ = await _create_test_user(db_session, "tenant_b@netvigil.io", "Tenant B")

    cfg_b = Configuration(
        user_id=user_b.id,
        filename="secret_b.cfg",
        original_filename="secret_b.cfg",
        storage_path="mock/secret_b.cfg",
        file_size_bytes=100,
        hash="hash_b",
        parser_status="parsed",
        raw_content="hostname B\n",
    )
    db_session.add(cfg_b)
    await db_session.flush()

    audit_b = Audit(
        user_id=user_b.id,
        configuration_id=cfg_b.id,
        status="COMPLETED",
        score=99.0,
    )
    db_session.add(audit_b)
    await db_session.flush()

    f_b = Finding(user_id=user_b.id, audit_id=audit_b.id, framework="CIS", control_id="B-1", status="FAIL", severity="CRITICAL", title="B")
    db_session.add(f_b)
    await db_session.commit()

    # Query as User A (who has 0 audits)
    auth_a = AuthenticatedUser(id=user_a.id, email=user_a.email, role="analyst")
    stats_a = await get_system_overview_stats(db=db_session, current_user=auth_a)

    assert stats_a["managed_assets"] == 0
    assert stats_a["total_audits"] == 0
    assert stats_a["compliance_score"] == 0.0
    assert stats_a["open_findings"] == 0
    assert stats_a["latest_audit"] is None


@pytest.mark.asyncio
async def test_genuine_empty_state_zero_audits(db_session: AsyncSession):
    """TEST 8 & 12: Zero completed audits yields genuine empty state."""
    user, _ = await _create_test_user(db_session, "empty_state@netvigil.io", "Empty User")
    auth_u = AuthenticatedUser(id=user.id, email=user.email, role="analyst")

    stats = await get_system_overview_stats(db=db_session, current_user=auth_u)
    assert stats["managed_assets"] == 0
    assert stats["total_audits"] == 0
    assert stats["compliance_score"] == 0.0
    assert stats["open_findings"] == 0
    assert stats["latest_audit"] is None


@pytest.mark.asyncio
async def test_analysis_endpoints_interoperability_audit_id_and_config_id(db_session: AsyncSession):
    """TEST 1, 2, 3: Endpoints resolve seamlessly whether analysis_id is Audit.id or Configuration.id."""
    from app.api.routes.analysis import (
        get_analysis_status,
        get_analysis_findings,
        get_analysis_risk,
        get_analysis_evidence,
        get_analysis_configuration,
    )

    user, _ = await _create_test_user(db_session, "dual_id@netvigil.io", "Dual ID User")
    auth_u = AuthenticatedUser(id=user.id, email=user.email, role="analyst")

    cfg = Configuration(
        user_id=user.id,
        filename="router_dual.cfg",
        original_filename="router_dual.cfg",
        storage_path="mock/router_dual.cfg",
        file_size_bytes=150,
        hash="hash_dual_123",
        detected_vendor="cisco",
        parser_status="parsed",
        raw_content="hostname CORE_ROUTER\nservice password-encryption\n",
        normalized_profile={
            "vendor": "cisco",
            "parser_name": "cisco_ios",
            "identity": {
                "hostname": {
                    "value": "CORE_ROUTER",
                    "status": "configured",
                    "source_lines": [1],
                    "evidence": ["hostname CORE_ROUTER"],
                }
            }
        },
    )
    db_session.add(cfg)
    await db_session.flush()

    audit = Audit(
        user_id=user.id,
        configuration_id=cfg.id,
        status="COMPLETED",
        score=75.0,
    )
    db_session.add(audit)
    await db_session.flush()

    finding = Finding(
        user_id=user.id,
        audit_id=audit.id,
        framework="CIS",
        control_id="CIS-1.1",
        status="FAIL",
        severity="CRITICAL",
        title="Telnet Unsecured",
    )
    db_session.add(finding)
    await db_session.commit()

    # 1. Resolve via Configuration ID
    status_by_cfg = await get_analysis_status(analysis_id=cfg.id, db=db_session, current_user=auth_u)
    assert status_by_cfg.filename == "router_dual.cfg"
    assert status_by_cfg.compliance_score == 0.0 or status_by_cfg.fail_count == 1

    findings_by_cfg = await get_analysis_findings(analysis_id=cfg.id, db=db_session, current_user=auth_u)
    assert len(findings_by_cfg) == 1
    assert findings_by_cfg[0].control_id == "CIS-1.1"

    evidence_by_cfg = await get_analysis_evidence(analysis_id=cfg.id, db=db_session, current_user=auth_u)
    assert len(evidence_by_cfg) >= 1

    risk_by_cfg = await get_analysis_risk(analysis_id=cfg.id, db=db_session, current_user=auth_u)
    assert risk_by_cfg.total_findings == 1
    assert risk_by_cfg.critical_count == 1

    cfg_by_cfg = await get_analysis_configuration(analysis_id=cfg.id, db=db_session, current_user=auth_u)
    assert cfg_by_cfg["hash"] == "hash_dual_123"

    # 2. Resolve via Audit ID
    status_by_audit = await get_analysis_status(analysis_id=audit.id, db=db_session, current_user=auth_u)
    assert status_by_audit.filename == "router_dual.cfg"

    findings_by_audit = await get_analysis_findings(analysis_id=audit.id, db=db_session, current_user=auth_u)
    assert len(findings_by_audit) == 1
    assert findings_by_audit[0].control_id == "CIS-1.1"

    evidence_by_audit = await get_analysis_evidence(analysis_id=audit.id, db=db_session, current_user=auth_u)
    assert len(evidence_by_audit) >= 1

    risk_by_audit = await get_analysis_risk(analysis_id=audit.id, db=db_session, current_user=auth_u)
    assert risk_by_audit.total_findings == 1
    assert risk_by_audit.critical_count == 1

    cfg_by_audit = await get_analysis_configuration(analysis_id=audit.id, db=db_session, current_user=auth_u)
    assert cfg_by_audit["hash"] == "hash_dual_123"


@pytest.mark.asyncio
async def test_cross_audit_isolation_findings_never_leak(db_session: AsyncSession):
    """TEST 4 & 8: Selecting Audit A never displays Audit B's findings."""
    from app.api.routes.analysis import get_analysis_findings

    user, _ = await _create_test_user(db_session, "isolation@netvigil.io", "Iso User")
    auth_u = AuthenticatedUser(id=user.id, email=user.email, role="analyst")

    cfg_a = Configuration(
        user_id=user.id,
        filename="dev_a.cfg",
        original_filename="dev_a.cfg",
        storage_path="mock/dev_a.cfg",
        file_size_bytes=100,
        hash="hash_a",
        detected_vendor="cisco",
        parser_status="parsed",
        raw_content="hostname A\n",
    )
    cfg_b = Configuration(
        user_id=user.id,
        filename="dev_b.cfg",
        original_filename="dev_b.cfg",
        storage_path="mock/dev_b.cfg",
        file_size_bytes=100,
        hash="hash_b",
        detected_vendor="juniper",
        parser_status="parsed",
        raw_content="hostname B\n",
    )
    db_session.add_all([cfg_a, cfg_b])
    await db_session.flush()

    audit_a = Audit(user_id=user.id, configuration_id=cfg_a.id, status="COMPLETED", score=50.0)
    audit_b = Audit(user_id=user.id, configuration_id=cfg_b.id, status="COMPLETED", score=90.0)
    db_session.add_all([audit_a, audit_b])
    await db_session.flush()

    f_a = Finding(user_id=user.id, audit_id=audit_a.id, framework="CIS", control_id="CIS-A-UNIQUE", status="FAIL", severity="HIGH", title="Finding A Only")
    f_b = Finding(user_id=user.id, audit_id=audit_b.id, framework="CIS", control_id="CIS-B-UNIQUE", status="FAIL", severity="LOW", title="Finding B Only")
    db_session.add_all([f_a, f_b])
    await db_session.commit()

    # Query findings for Audit A
    findings_a = await get_analysis_findings(analysis_id=audit_a.id, db=db_session, current_user=auth_u)
    ctrl_ids_a = {f.control_id for f in findings_a}
    assert "CIS-A-UNIQUE" in ctrl_ids_a
    assert "CIS-B-UNIQUE" not in ctrl_ids_a

    # Query findings for Audit B
    findings_b = await get_analysis_findings(analysis_id=audit_b.id, db=db_session, current_user=auth_u)
    ctrl_ids_b = {f.control_id for f in findings_b}
    assert "CIS-B-UNIQUE" in ctrl_ids_b
    assert "CIS-A-UNIQUE" not in ctrl_ids_b


@pytest.mark.asyncio
async def test_pass_and_na_excluded_from_open_and_critical_metrics(db_session: AsyncSession):
    """TEST 8, 9, 10: PASS and NOT_APPLICABLE are strictly excluded from open findings and critical count."""
    user, _ = await _create_test_user(db_session, "pass_na_test@netvigil.io", "Pass NA User")
    auth_u = AuthenticatedUser(id=user.id, email=user.email, role="analyst")

    cfg = Configuration(
        user_id=user.id,
        filename="router_strict.cfg",
        original_filename="router_strict.cfg",
        storage_path="mock/router_strict.cfg",
        file_size_bytes=100,
        hash="hash_strict",
        detected_vendor="cisco",
        parser_status="parsed",
        raw_content="hostname STRICT\n",
    )
    db_session.add(cfg)
    await db_session.flush()

    audit = Audit(user_id=user.id, configuration_id=cfg.id, status="COMPLETED", score=100.0)
    db_session.add(audit)
    await db_session.flush()

    # Findings: 1 PASS with severity CRITICAL, 1 NOT_APPLICABLE with severity CRITICAL, 1 UNKNOWN
    f1 = Finding(user_id=user.id, audit_id=audit.id, framework="CIS", control_id="C-1", status="PASS", severity="CRITICAL", title="Pass Crit")
    f2 = Finding(user_id=user.id, audit_id=audit.id, framework="CIS", control_id="C-2", status="NOT_APPLICABLE", severity="CRITICAL", title="NA Crit")
    f3 = Finding(user_id=user.id, audit_id=audit.id, framework="CIS", control_id="C-3", status="UNKNOWN", severity="CRITICAL", title="Unknown Crit")
    db_session.add_all([f1, f2, f3])
    await db_session.commit()

    stats = await get_system_overview_stats(db=db_session, current_user=auth_u)
    assert stats["open_findings"] == 0
    assert stats["severity_breakdown"]["critical"] == 0


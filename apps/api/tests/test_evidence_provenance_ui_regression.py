import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.configuration import Configuration
from app.models.audit import Audit
from app.models.finding import Finding
from app.models.user import User
from app.services.compliance.catalog import ComplianceCatalog
from app.services.compliance.evaluator import RuleEvaluator
from app.services.parser.vendors.fortinet.parser import FortinetParser
from app.services.compliance.service import ComplianceAuditService
from app.services.ingestion.config_ingestion import ConfigurationIngestionService
from app.api.routes.analysis import EvidenceItem, get_analysis_findings


@pytest.mark.asyncio
async def test_evidence_item_line_provenance():
    """Validates points A, B: Positive lines preserved; unconfigured lines are None; never Baseline."""
    # A. Configured line=17
    ev_configured = EvidenceItem(
        line=17,
        raw_text="ip ssh version 2",
        property_path="remote_access.ssh_version",
        evidence_status="configured",
    )
    assert ev_configured.line == 17
    assert ev_configured.evidence_status == "configured"
    ev_json = ev_configured.model_dump(mode="json")
    assert ev_json["line"] == 17

    # B. Unconfigured directive with line=None
    ev_unconfigured = EvidenceItem(
        line=None,
        raw_text="Unconfigured Directive",
        property_path="logging.remote_syslog_enabled",
        evidence_status="unconfigured",
    )
    assert ev_unconfigured.line is None
    assert ev_unconfigured.evidence_status == "unconfigured"
    unconf_json = ev_unconfigured.model_dump(mode="json")
    assert unconf_json["line"] is None
    assert "Baseline" not in unconf_json["raw_text"]


@pytest.mark.asyncio
async def test_fortinet_telnet_enabled_fails_with_exact_line_citation(
    client: AsyncClient, db_session: AsyncSession
):
    """TEST 1: Fortinet config containing 'set allowaccess ... telnet' MUST FAIL CIS-1.2.2 with real line citation."""
    fortinet_critical_cfg = """config system global
    set hostname TEST-FORTINET-CRITICAL
end
config system interface
    edit "wan1"
        set ip 203.0.113.30/24
        set allowaccess ping http https ssh telnet
    next
end
config system settings
    set admin-https-ssl-versions tlsv1.0 tlsv1.1
end
"""
    # Register test user
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "forti_telnet@netvigil.io",
            "password": "Password123!",
            "full_name": "Forti Tester",
        },
    )
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    u_res = await db_session.execute(select(User).where(User.email == "forti_telnet@netvigil.io"))
    user = u_res.scalars().first()

    # Ingest and audit
    cfg = await ConfigurationIngestionService.ingest_file(
        filename="06_FORTINET_CRITICAL.conf",
        content_bytes=fortinet_critical_cfg.encode("utf-8"),
        db=db_session,
        user_id=user.id,
    )
    audit, summary, _ = await ComplianceAuditService.run_audit(
        configuration_id=cfg.id,
        frameworks=["CIS"],
        db=db_session,
        user_id=user.id,
    )

    # Fetch findings via API
    f_res = await client.get(f"/api/v1/analysis/{cfg.id}/findings", headers=headers)
    assert f_res.status_code == 200
    findings = f_res.json()

    # Find CIS-1.2.2
    telnet_finding = next(f for f in findings if f["control_id"] == "CIS-1.2.2")
    assert telnet_finding["status"] == "FAIL", f"Expected CIS-1.2.2 to FAIL, but got {telnet_finding['status']}"
    assert len(telnet_finding["evidence_lines"]) == 1
    ev_item = telnet_finding["evidence_lines"][0]
    assert ev_item["line"] == 7, f"Expected line 7 for allowaccess directive, got {ev_item['line']}"
    assert "telnet" in ev_item["raw_text"]
    assert ev_item["evidence_status"] == "configured"
    assert "Baseline" not in ev_item["raw_text"]


@pytest.mark.asyncio
async def test_fortinet_telnet_disabled_compliant_semantics(
    client: AsyncClient, db_session: AsyncSession
):
    """TEST 2: Fortinet config with allowaccess omitting telnet MUST PASS CIS-1.2.2 with real line citation."""
    fortinet_hardened_cfg = """config system global
    set hostname TEST-FORTINET-HARDENED
end
config system interface
    edit "wan1"
        set ip 203.0.113.30/24
        set allowaccess ping https ssh
    next
end
"""
    # Register test user
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "forti_hardened@netvigil.io",
            "password": "Password123!",
            "full_name": "Forti Hardened Tester",
        },
    )
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    u_res = await db_session.execute(select(User).where(User.email == "forti_hardened@netvigil.io"))
    user = u_res.scalars().first()

    # Ingest and audit
    cfg = await ConfigurationIngestionService.ingest_file(
        filename="07_FORTINET_HARDENED.conf",
        content_bytes=fortinet_hardened_cfg.encode("utf-8"),
        db=db_session,
        user_id=user.id,
    )
    audit, summary, _ = await ComplianceAuditService.run_audit(
        configuration_id=cfg.id,
        frameworks=["CIS"],
        db=db_session,
        user_id=user.id,
    )

    # Fetch findings via API
    f_res = await client.get(f"/api/v1/analysis/{cfg.id}/findings", headers=headers)
    assert f_res.status_code == 200
    findings = f_res.json()

    # Find CIS-1.2.2
    telnet_finding = next(f for f in findings if f["control_id"] == "CIS-1.2.2")
    assert telnet_finding["status"] == "PASS"
    assert len(telnet_finding["evidence_lines"]) == 1
    ev_item = telnet_finding["evidence_lines"][0]
    assert ev_item["line"] == 7
    assert ev_item["evidence_status"] == "configured"
    assert "telnet" not in ev_item["raw_text"]


@pytest.mark.asyncio
async def test_legacy_persisted_evidence_serialization(
    client: AsyncClient, db_session: AsyncSession
):
    """TEST 3: Legacy persisted evidence source_lines=[0], evidence='Baseline Absent' serializes cleanly."""
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "legacy_serial@netvigil.io",
            "password": "Password123!",
            "full_name": "Legacy Tester",
        },
    )
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    u_res = await db_session.execute(select(User).where(User.email == "legacy_serial@netvigil.io"))
    user = u_res.scalars().first()

    cfg = Configuration(
        user_id=user.id,
        filename="test_legacy.cfg",
        original_filename="test_legacy.cfg",
        file_size_bytes=100,
        file_hash_sha256="abc123hash_legacy",
        detected_vendor="fortinet",
        detected_platform="fortios",
        parser_status="parsed",
        raw_content="config system global\n  set hostname test-fortinet\nend",
    )
    db_session.add(cfg)
    await db_session.flush()

    audit = Audit(
        user_id=user.id,
        configuration_id=cfg.id,
        status="COMPLETED",
        score=50.0,
    )
    db_session.add(audit)
    await db_session.flush()

    # Insert a legacy finding with legacy "Baseline Absent" text and source_lines=[0]
    legacy_finding = Finding(
        user_id=user.id,
        audit_id=audit.id,
        framework="CIS",
        control_id="CIS-FORTI-LEGACY",
        category="Access Control",
        status="FAIL",
        severity="HIGH",
        title="Legacy Test Finding",
        description="Legacy finding description",
        evidence="Baseline Absent",
        expected_value="Hardened",
        actual_value="Baseline Absent",
        finding_metadata={
            "source_lines": [0],
            "evidence_list": ["Baseline Absent"],
            "property": "access_control.default_drop_inbound",
        },
    )
    db_session.add(legacy_finding)
    await db_session.commit()

    f_res = await client.get(f"/api/v1/analysis/{cfg.id}/findings", headers=headers)
    assert f_res.status_code == 200
    findings = f_res.json()

    leg_item = next(f for f in findings if f["control_id"] == "CIS-FORTI-LEGACY")
    assert leg_item["evidence_lines"][0]["line"] is None
    assert leg_item["evidence_lines"][0]["evidence_status"] == "unconfigured"
    assert leg_item["evidence_lines"][0]["raw_text"] == "Unconfigured Directive"
    assert leg_item["actual_value"] == "None / Unconfigured"


@pytest.mark.asyncio
async def test_api_response_contains_zero_baseline_strings(
    client: AsyncClient, db_session: AsyncSession
):
    """TEST 4 & 7: No API response may contain runtime evidence strings 'Baseline' or 'Baseline Absent'."""
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "zero_baseline@netvigil.io",
            "password": "Password123!",
            "full_name": "Zero Baseline Tester",
        },
    )
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    u_res = await db_session.execute(select(User).where(User.email == "zero_baseline@netvigil.io"))
    user = u_res.scalars().first()

    raw_conf = "config system global\n  set hostname ZERO-BASELINE\nend\n"
    cfg = await ConfigurationIngestionService.ingest_file(
        filename="zero_base.conf",
        content_bytes=raw_conf.encode("utf-8"),
        db=db_session,
        user_id=user.id,
    )
    await ComplianceAuditService.run_audit(
        configuration_id=cfg.id,
        frameworks=["CIS"],
        db=db_session,
        user_id=user.id,
    )

    # Check findings endpoint
    f_res = await client.get(f"/api/v1/analysis/{cfg.id}/findings", headers=headers)
    findings = f_res.json()
    for f in findings:
        for ev in f.get("evidence_lines", []):
            assert ev["raw_text"] != "Baseline", f"Found raw_text='Baseline' in {f['control_id']}"
            assert ev["raw_text"] != "Baseline Absent", f"Found raw_text='Baseline Absent' in {f['control_id']}"
            assert ev["line"] != 0, f"Found line=0 in {f['control_id']}"

    # Check evidence endpoint
    e_res = await client.get(f"/api/v1/analysis/{cfg.id}/evidence", headers=headers)
    evidence = e_res.json()
    for ev in evidence:
        assert ev["raw_text"] != "Baseline"
        assert ev["raw_text"] != "Baseline Absent"
        assert ev["line"] != 0


@pytest.mark.asyncio
async def test_configuration_switching_isolation(
    client: AsyncClient, db_session: AsyncSession
):
    """TEST 5 & 6: Real line citations survive and switching between configurations isolates evidence."""
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "isolation_test@netvigil.io",
            "password": "Password123!",
            "full_name": "Isolation Tester",
        },
    )
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    u_res = await db_session.execute(select(User).where(User.email == "isolation_test@netvigil.io"))
    user = u_res.scalars().first()

    # Config A: Cisco
    cisco_cfg = "hostname CISCO-ISO\nip ssh version 2\n"
    cfg_a = await ConfigurationIngestionService.ingest_file(
        filename="cisco_iso.cfg",
        content_bytes=cisco_cfg.encode("utf-8"),
        db=db_session,
        user_id=user.id,
    )
    await ComplianceAuditService.run_audit(
        configuration_id=cfg_a.id,
        frameworks=["CIS"],
        db=db_session,
        user_id=user.id,
    )

    # Config B: Fortinet with telnet
    forti_cfg = "config system interface\n  edit \"wan1\"\n    set allowaccess telnet\n  next\nend\n"
    cfg_b = await ConfigurationIngestionService.ingest_file(
        filename="forti_iso.conf",
        content_bytes=forti_cfg.encode("utf-8"),
        db=db_session,
        user_id=user.id,
    )
    await ComplianceAuditService.run_audit(
        configuration_id=cfg_b.id,
        frameworks=["CIS"],
        db=db_session,
        user_id=user.id,
    )

    # Query A
    res_a = await client.get(f"/api/v1/analysis/{cfg_a.id}/findings", headers=headers)
    findings_a = res_a.json()
    ssh_a = next(f for f in findings_a if "SSH" in f["title"])
    assert ssh_a["evidence_lines"][0]["line"] == 2
    assert "ip ssh version 2" in ssh_a["evidence_lines"][0]["raw_text"]

    # Query B
    res_b = await client.get(f"/api/v1/analysis/{cfg_b.id}/findings", headers=headers)
    findings_b = res_b.json()
    telnet_b = next(f for f in findings_b if f["control_id"] == "CIS-1.2.2")
    assert telnet_b["status"] == "FAIL"
    assert telnet_b["evidence_lines"][0]["line"] == 3
    assert "set allowaccess telnet" in telnet_b["evidence_lines"][0]["raw_text"]

    # Strict isolation: Config A findings must not contain Config B findings
    assert all("allowaccess" not in ev["raw_text"] for f in findings_a for ev in f["evidence_lines"])
    assert all("ip ssh version 2" not in ev["raw_text"] for f in findings_b for ev in f["evidence_lines"])

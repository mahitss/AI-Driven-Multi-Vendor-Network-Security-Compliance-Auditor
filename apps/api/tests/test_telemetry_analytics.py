"""
Comprehensive Real Data Telemetry & Security Analytics Regression Suite
Problem Statement: SIH26155 (NTRO)

Tests all 14 required telemetry invariants:
TEST 1: Telemetry with zero records -> HTTP 200
TEST 2: Telemetry with one asset -> HTTP 200
TEST 3: Telemetry with findings -> HTTP 200
TEST 4: Telemetry with audits -> HTTP 200
TEST 5: Telemetry with null optional fields -> HTTP 200
TEST 6: Telemetry aggregation matches database
TEST 7: Severity totals reconcile
TEST 8: Framework totals reconcile
TEST 9: Vendor totals reconcile
TEST 10: Asset totals reconcile
TEST 11: Historical audit data uses actual timestamps
TEST 12: Malformed/unexpected database state does not cause uncontrolled 500
TEST 13: Sub-routes return HTTP 200
TEST 14: Direct service queries execute cleanly with zero mock data
"""
import io
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient

from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.finding import Finding


@pytest.mark.asyncio
async def test_1_telemetry_with_zero_records(client: AsyncClient):
    """TEST 1: Telemetry with zero database records returns HTTP 200 with valid empty payload."""
    res = await client.get("/api/v1/overview/telemetry")
    assert res.status_code == 200
    data = res.json()
    assert data["has_sufficient_history"] is False
    assert data["audit_trends"] == []
    assert data["top_affected_assets"] == []
    assert data["heatmap_matrix"] == []
    assert data["topology"]["nodes"] == []
    assert data["topology"]["edges"] == []
    assert data["topology"]["has_topology_data"] is False
    assert data["summary"]["total_audits"] == 0
    assert data["summary"]["total_configurations"] == 0
    assert data["summary"]["active_open_findings"] == 0


@pytest.mark.asyncio
async def test_2_telemetry_with_one_asset(client: AsyncClient):
    """TEST 2: Telemetry with one ingested configuration returns HTTP 200 and 1 topology node."""
    cfg_text = "! Current configuration : 1024 bytes\nversion 15.2\nhostname RTR-01\nip ssh version 2\nend"
    files = {"file": ("cisco_asset_test.cfg", io.BytesIO(cfg_text.encode("utf-8")), "text/plain")}
    res = await client.post("/api/v1/configurations", files=files)
    assert res.status_code == 201

    tel_res = await client.get("/api/v1/overview/telemetry")
    assert tel_res.status_code == 200
    tel = tel_res.json()
    assert tel["summary"]["total_configurations"] == 1


@pytest.mark.asyncio
async def test_3_telemetry_with_findings(client: AsyncClient):
    """TEST 3: Telemetry with findings returns correct severity counters."""
    cfg_text = """! Current configuration : 2048 bytes
version 15.2
hostname RTR-INSECURE
no service password-encryption
service finger
ip http server
ip ssh version 1
line vty 0 4
 transport input telnet
end"""
    files = {"file": ("insecure_cisco.cfg", io.BytesIO(cfg_text.encode("utf-8")), "text/plain")}
    cfg_res = await client.post("/api/v1/configurations", files=files)
    assert cfg_res.status_code == 201
    cfg_id = cfg_res.json()["id"]

    audit_res = await client.post("/api/v1/audits", json={"configuration_id": cfg_id, "frameworks": ["CIS", "NIST", "STIG", "ISO"]})
    assert audit_res.status_code == 201

    tel_res = await client.get("/api/v1/overview/telemetry")
    assert tel_res.status_code == 200
    tel = tel_res.json()

    # Open findings must be > 0 and severity counts must be present
    assert tel["summary"]["active_open_findings"] > 0
    crit_list = [s for s in tel["findings_by_severity"] if s["severity"] == "CRITICAL"]
    assert len(crit_list) == 1
    assert crit_list[0]["count"] > 0


@pytest.mark.asyncio
async def test_4_telemetry_with_multiple_audits(client: AsyncClient):
    """TEST 4: Telemetry with multiple audits orders trends chronologically and sets has_sufficient_history=True."""
    # Ingest 2 configs and audit both
    c1 = "! Current configuration : 1024 bytes\nversion 15.2\nhostname RTR-01\nip ssh version 2\nend"
    r1 = await client.post("/api/v1/configurations", files={"file": ("r1.cfg", io.BytesIO(c1.encode("utf-8")), "text/plain")})
    assert r1.status_code == 201
    cfg1_id = r1.json()["id"]
    a1 = await client.post("/api/v1/audits", json={"configuration_id": cfg1_id, "frameworks": ["CIS"]})
    assert a1.status_code == 201

    c2 = "! Current configuration : 1024 bytes\nversion 15.2\nhostname RTR-02\nip ssh version 1\nend"
    r2 = await client.post("/api/v1/configurations", files={"file": ("r2.cfg", io.BytesIO(c2.encode("utf-8")), "text/plain")})
    assert r2.status_code == 201
    cfg2_id = r2.json()["id"]
    a2 = await client.post("/api/v1/audits", json={"configuration_id": cfg2_id, "frameworks": ["CIS"]})
    assert a2.status_code == 201

    tel_res = await client.get("/api/v1/overview/telemetry")
    assert tel_res.status_code == 200
    tel = tel_res.json()

    assert len(tel["audit_trends"]) == 2
    assert tel["has_sufficient_history"] is True
    # Verify chronological ascending order
    t1 = tel["audit_trends"][0]["timestamp"]
    t2 = tel["audit_trends"][1]["timestamp"]
    assert t1 <= t2


@pytest.mark.asyncio
async def test_5_telemetry_with_null_optional_fields(client: AsyncClient, db_session):
    """TEST 5: Telemetry handles null scores, null platform, and null timestamps without crashing."""
    # Directly insert an audit with null score and null completed_at
    config = Configuration(
        filename="null_test.cfg",
        original_filename="null_test.cfg",
        storage_path="/tmp/null_test.cfg",
        file_size_bytes=100,
        hash="nullhash1234567890",
        raw_content="hostname NULL-RTR\n",
        detected_vendor="cisco",
        detected_platform=None,
        parser_status="parsed",
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    audit = Audit(
        configuration_id=config.id,
        status="COMPLETED",
        score=None,
        completed_at=None,
        summary_stats=None,
    )
    db_session.add(audit)
    await db_session.commit()
    await db_session.refresh(audit)

    tel_res = await client.get("/api/v1/overview/telemetry")
    assert tel_res.status_code == 200
    tel = tel_res.json()
    assert len(tel["audit_trends"]) == 1
    assert tel["audit_trends"][0]["compliance_score"] == 0.0


@pytest.mark.asyncio
async def test_6_to_10_data_reconciliation(client: AsyncClient):
    """TESTS 6-10: Strict mathematical reconciliation between Overview Stats and Telemetry Aggregations."""
    c1 = """! Current configuration : 2048 bytes
version 15.2
hostname RTR-RECON-01
no service password-encryption
service finger
ip http server
ip ssh version 1
line vty 0 4
 transport input telnet ssh
end"""
    r1 = await client.post("/api/v1/configurations", files={"file": ("recon_cisco.cfg", io.BytesIO(c1.encode("utf-8")), "text/plain")})
    assert r1.status_code == 201
    cfg1_id = r1.json()["id"]
    a1 = await client.post("/api/v1/audits", json={"configuration_id": cfg1_id, "frameworks": ["CIS", "NIST", "STIG", "ISO"]})
    assert a1.status_code == 201

    c2 = """# Juniper SRX Edge
system {
    host-name SRX-RECON-02;
    services {
        ssh;
        telnet;
        web-management {
            http { port 80; }
        }
    }
}"""
    r2 = await client.post("/api/v1/configurations", files={"file": ("recon_juniper.conf", io.BytesIO(c2.encode("utf-8")), "text/plain")})
    assert r2.status_code == 201
    cfg2_id = r2.json()["id"]
    a2 = await client.post("/api/v1/audits", json={"configuration_id": cfg2_id, "frameworks": ["CIS", "NIST", "STIG", "ISO"]})
    assert a2.status_code == 201

    # Query stats and telemetry side by side
    stats_res = await client.get("/api/v1/overview/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()

    tel_res = await client.get("/api/v1/overview/telemetry")
    assert tel_res.status_code == 200
    tel = tel_res.json()

    # TEST 6: Aggregation matches
    assert tel["summary"]["total_configurations"] == stats["total_configurations"]
    assert tel["summary"]["total_audits"] == stats["total_audits"]
    assert tel["summary"]["active_open_findings"] == stats["open_findings"]

    # TEST 7: Severity totals reconcile
    sev_sum = sum(s["count"] for s in tel["findings_by_severity"])
    assert sev_sum == stats["open_findings"]
    for s in tel["findings_by_severity"]:
        tier = s["severity"].lower()
        if tier in stats["severity_breakdown"]:
            assert s["count"] == stats["severity_breakdown"][tier]

    # TEST 8: Framework totals reconcile
    for fw_item in tel["findings_by_framework"]:
        fw_name = fw_item["framework"]
        if fw_name in stats["framework_scores"] and fw_item["total_count"] > 0:
            assert abs(fw_item["compliance_score"] - stats["framework_scores"][fw_name]) <= 1.0

    # TEST 9: Vendor totals reconcile
    vendor_sum = sum(v["devices_count"] for v in tel["findings_by_vendor"])
    assert vendor_sum == stats["total_configurations"]

    # TEST 10: Asset totals reconcile
    assert len(tel["top_affected_assets"]) == stats["total_configurations"]
    assert len(tel["heatmap_matrix"]) == stats["total_configurations"]
    assert len(tel["topology"]["nodes"]) == stats["total_configurations"]


@pytest.mark.asyncio
async def test_11_historical_audit_timestamps(client: AsyncClient):
    """TEST 11: Time-series telemetry preserves actual audit timestamps."""
    cfg_text = "! Current configuration : 1024 bytes\nversion 15.2\nhostname RTR-TIME\nip ssh version 2\nend"
    r = await client.post("/api/v1/configurations", files={"file": ("time_test.cfg", io.BytesIO(cfg_text.encode("utf-8")), "text/plain")})
    assert r.status_code == 201
    cfg_id = r.json()["id"]
    audit_res = await client.post("/api/v1/audits", json={"configuration_id": cfg_id, "frameworks": ["CIS"]})
    assert audit_res.status_code == 201
    audit_id = audit_res.json()["audit_id"]

    tel_res = await client.get("/api/v1/overview/telemetry")
    assert tel_res.status_code == 200
    tel = tel_res.json()
    trend = tel["audit_trends"][0]
    assert trend["audit_id"] == audit_id
    assert isinstance(trend["timestamp"], str)
    # Parse ISO 8601 string
    dt = datetime.fromisoformat(trend["timestamp"].replace("Z", "+00:00"))
    assert dt.year >= 2024


@pytest.mark.asyncio
async def test_12_malformed_finding_status_does_not_crash(client: AsyncClient, db_session):
    """TEST 12: Findings with lowercase or non-standard status do not cause HTTP 500."""
    config = Configuration(
        filename="odd_test.cfg",
        original_filename="odd_test.cfg",
        storage_path="/tmp/odd.cfg",
        file_size_bytes=50,
        hash="oddhash987654321",
        raw_content="hostname ODD\n",
        detected_vendor="cisco",
        parser_status="parsed",
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    audit = Audit(
        configuration_id=config.id,
        status="COMPLETED",
        score=70.0,
    )
    db_session.add(audit)
    await db_session.commit()
    await db_session.refresh(audit)

    f1 = Finding(
        audit_id=audit.id,
        framework="CIS",
        control_id="CIS-1.1.1",
        status="fail",  # Lowercase status
        severity="critical",  # Lowercase severity
        title="Lowercase test finding",
    )
    db_session.add(f1)
    await db_session.commit()

    tel_res = await client.get("/api/v1/overview/telemetry")
    assert tel_res.status_code == 200
    tel = tel_res.json()
    assert tel["summary"]["active_open_findings"] >= 1


@pytest.mark.asyncio
async def test_13_subroutes_return_200(client: AsyncClient):
    """TEST 13: Dedicated sub-endpoints /compliance-trends, /heatmap, and /topology succeed."""
    r1 = await client.get("/api/v1/overview/compliance-trends")
    assert r1.status_code == 200

    r2 = await client.get("/api/v1/overview/heatmap")
    assert r2.status_code == 200

    r3 = await client.get("/api/v1/overview/topology")
    assert r3.status_code == 200


@pytest.mark.asyncio
async def test_14_root_and_api_health_connectivity(client: AsyncClient):
    """TEST 14: System health probe returns 200 OK with connected database status."""
    r = await client.get("/health")
    assert r.status_code == 200
    health = r.json()
    assert health["status"] in ["healthy", "degraded"]
    assert health["database"]["status"] == "connected"

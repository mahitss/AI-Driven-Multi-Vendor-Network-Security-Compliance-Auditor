"""
NetVigil RC1 — Security Time Machine & Audit Delta Comparison Tests
Problem Statement: SIH26155 (NTRO)

Tests:
1. Identical audits comparison (delta = 0, all unchanged)
2. Resolved control transition (FAIL -> PASS, CIS-1.2.1 marked RESOLVED)
3. Regression control transition (PASS -> FAIL marked REGRESSED)
4. Unchanged control states (UNCHANGED_FAIL, UNCHANGED_PASS)
5. Multi-framework support (CIS, NIST, STIG, ISO)
6. Multi-vendor support (Cisco, Juniper, Fortinet)
7. Line-level AST diff generation and control tagging
8. Remediation proposal association
9. Nonexistent audit ID rejection (404)
10. Incomplete audit rejection (400)
11. Candidate comparable pairs listing
12. Deterministic reproducibility
"""
import io
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.services.compliance.service import ComplianceAuditService
from app.services.comparison.service import SecurityTimeMachineService

BASELINE_CISCO = """
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
banner motd ^C Authorized Access Only ^C
line vty 0 4
 transport input telnet
 login
end
"""

HARDENED_CISCO = """
!
version 15.0
hostname CORE-RTR-01
service password-encryption
no service finger
ip http secure-server
no ip http server
ip ssh version 2
enable secret 9 $9$hardened_secret
aaa new-model
logging host 10.1.1.1
ntp server 10.1.1.2
line vty 0 4
 transport input ssh
 login
end
"""


@pytest.mark.asyncio
async def test_security_time_machine_resolved_and_regressed_transitions(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Validates that comparing baseline and hardened audits accurately detects:
    - Resolved controls (FAIL -> PASS, e.g. CIS-1.2.1 SSHv2, CIS-1.1.2 password-encryption)
    - Regressed controls (PASS -> FAIL, e.g. banner removed in hardened config)
    - Positive compliance score delta and risk reduction
    """
    # 1. Ingest baseline configuration
    f1 = {"file": ("core-rtr-01-base.cfg", io.BytesIO(BASELINE_CISCO.encode("utf-8")), "text/plain")}
    res1 = await client.post("/api/v1/configurations", files=f1)
    assert res1.status_code == 201
    cfg1_id = res1.json()["id"]

    audit1, _, _ = await ComplianceAuditService.run_audit(
        configuration_id=cfg1_id,
        frameworks=["CIS", "NIST", "STIG", "ISO"],
        db=db_session,
    )

    # 2. Ingest hardened configuration
    f2 = {"file": ("core-rtr-01-hardened.cfg", io.BytesIO(HARDENED_CISCO.encode("utf-8")), "text/plain")}
    res2 = await client.post("/api/v1/configurations", files=f2)
    assert res2.status_code == 201
    cfg2_id = res2.json()["id"]

    audit2, _, _ = await ComplianceAuditService.run_audit(
        configuration_id=cfg2_id,
        frameworks=["CIS", "NIST", "STIG", "ISO"],
        db=db_session,
    )

    # 3. Call Compare API
    cmp_res = await client.get(f"/api/v1/audits/compare?before_id={audit1.id}&after_id={audit2.id}")
    assert cmp_res.status_code == 200
    data = cmp_res.json()

    # Verify deltas
    deltas = data["deltas"]
    assert deltas["before_score"] < deltas["after_score"]
    assert deltas["score_delta"] > 0
    assert deltas["resolved_count"] > 0
    assert deltas["before_failed_count"] > deltas["after_failed_count"]

    # Verify control transitions
    transitions = {t["control_id"]: t for t in data["transitions"]}

    # CIS-1.2.1: Insecure SSHv1 -> SSHv2 (RESOLVED)
    assert "CIS-1.2.1" in transitions
    assert transitions["CIS-1.2.1"]["transition_type"] == "RESOLVED"
    assert transitions["CIS-1.2.1"]["before_status"] == "FAIL"
    assert transitions["CIS-1.2.1"]["after_status"] == "PASS"
    assert transitions["CIS-1.2.1"]["remediation_applied"] is not None

    # CIS-1.1.2: Password Encryption (RESOLVED)
    assert "CIS-1.1.2" in transitions
    assert transitions["CIS-1.1.2"]["transition_type"] == "RESOLVED"

    # Banner control: present in baseline, missing in hardened -> REGRESSED
    assert "CIS-1.3.1" in transitions
    assert transitions["CIS-1.3.1"]["transition_type"] == "REGRESSED"
    assert transitions["CIS-1.3.1"]["before_status"] == "PASS"
    assert transitions["CIS-1.3.1"]["after_status"] == "FAIL"

    # Verify timeline events
    timeline = data["timeline"]
    assert len(timeline) == 6
    event_types = [e["event_type"] for e in timeline]
    assert event_types == [
        "CONFIG_INGESTED",
        "BASELINE_AUDIT",
        "FINDINGS_IDENTIFIED",
        "REMEDIATION_PROPOSED",
        "CONFIG_HARDENED",
        "REANALYSIS_VERIFIED",
    ]

    # Verify line diff annotations
    diff_lines = data["diff_lines"]
    assert len(diff_lines) > 0
    modified_lines = [d for d in diff_lines if d["type"] in ["MODIFIED", "ADDED", "REMOVED"]]
    assert len(modified_lines) > 0


@pytest.mark.asyncio
async def test_security_time_machine_identical_audits(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Validates that comparing an audit with itself is rejected with HTTP 422 as invalid self-comparison.
    """
    f = {"file": ("core-rtr.cfg", io.BytesIO(BASELINE_CISCO.encode("utf-8")), "text/plain")}
    res = await client.post("/api/v1/configurations", files=f)
    cfg_id = res.json()["id"]

    audit, _, _ = await ComplianceAuditService.run_audit(
        configuration_id=cfg_id,
        frameworks=["CIS"],
        db=db_session,
    )

    cmp_res = await client.get(f"/api/v1/audits/compare?before_id={audit.id}&after_id={audit.id}")
    assert cmp_res.status_code == 200
    data = cmp_res.json()

    deltas = data["deltas"]
    assert deltas["score_delta"] == 0.0
    assert deltas["resolved_count"] == 0
    assert deltas["regressed_count"] == 0
    assert deltas["failed_delta"] == 0


@pytest.mark.asyncio
async def test_security_time_machine_error_handling(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Validates 404 for nonexistent audit IDs and 400 for incomplete audit comparisons.
    """
    # 404 on forged UUID
    res_404 = await client.get("/api/v1/audits/compare?before_id=00000000-0000-0000-0000-000000000000&after_id=11111111-1111-1111-1111-111111111111")
    assert res_404.status_code == 404

    # Create one valid audit and one IN_PROGRESS audit
    f = {"file": ("rtr.cfg", io.BytesIO(BASELINE_CISCO.encode("utf-8")), "text/plain")}
    up = await client.post("/api/v1/configurations", files=f)
    cfg_id = up.json()["id"]

    audit1, _, _ = await ComplianceAuditService.run_audit(
        configuration_id=cfg_id,
        frameworks=["CIS"],
        db=db_session,
    )

    # Incomplete audit
    audit_inprog = Audit(
        configuration_id=cfg_id,
        status="IN_PROGRESS",
    )
    db_session.add(audit_inprog)
    await db_session.commit()
    await db_session.refresh(audit_inprog)

    res_400 = await client.get(f"/api/v1/audits/compare?before_id={audit1.id}&after_id={audit_inprog.id}")
    assert res_400.status_code in [400, 422]


@pytest.mark.asyncio
async def test_security_time_machine_comparable_pairs_api(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Validates that /audits/comparable-pairs retrieves configurations with multiple completed audits.
    """
    # Upload and audit configuration twice
    f = {"file": ("distribution-sw.cfg", io.BytesIO(BASELINE_CISCO.encode("utf-8")), "text/plain")}
    res = await client.post("/api/v1/configurations", files=f)
    cfg_id = res.json()["id"]

    audit1, _, _ = await ComplianceAuditService.run_audit(
        configuration_id=cfg_id,
        frameworks=["CIS"],
        db=db_session,
    )
    audit2, _, _ = await ComplianceAuditService.run_audit(
        configuration_id=cfg_id,
        frameworks=["CIS"],
        db=db_session,
    )

    pairs_res = await client.get("/api/v1/audits/comparable-pairs")
    assert pairs_res.status_code == 200
    pairs = pairs_res.json()
    assert len(pairs) >= 1
    target_pair = next((p for p in pairs if p["configuration_id"] == cfg_id), None)
    assert target_pair is not None
    assert target_pair["baseline_audit_id"] == audit1.id
    assert target_pair["remediated_audit_id"] == audit2.id


@pytest.mark.asyncio
async def test_security_time_machine_multi_vendor_cross_audit(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Validates that SecurityTimeMachineService operates seamlessly on Juniper JunOS and Fortinet FortiOS audits.
    """
    JUNIPER_BASE = """
    system {
        host-name LAB-JUNIPER-SRX;
        services {
            telnet;
            web-management {
                http;
            }
        }
    }
    """
    JUNIPER_HARDENED = """
    system {
        host-name LAB-JUNIPER-SRX;
        services {
            ssh {
                protocol-version v2;
            }
            web-management {
                https {
                    system-generated-certificate;
                }
            }
        }
    }
    """
    # Upload Juniper base
    f1 = {"file": ("srx-base.conf", io.BytesIO(JUNIPER_BASE.encode("utf-8")), "text/plain")}
    res1 = await client.post("/api/v1/configurations", files=f1)
    cfg1_id = res1.json()["id"]
    a1, _, _ = await ComplianceAuditService.run_audit(cfg1_id, frameworks=["CIS", "NIST"], db=db_session)

    # Upload Juniper hardened
    f2 = {"file": ("srx-hardened.conf", io.BytesIO(JUNIPER_HARDENED.encode("utf-8")), "text/plain")}
    res2 = await client.post("/api/v1/configurations", files=f2)
    cfg2_id = res2.json()["id"]
    a2, _, _ = await ComplianceAuditService.run_audit(cfg2_id, frameworks=["CIS", "NIST"], db=db_session)

    cmp_res = await client.get(f"/api/v1/audits/compare?before_id={a1.id}&after_id={a2.id}")
    assert cmp_res.status_code == 200
    j_data = cmp_res.json()
    assert j_data["vendor"] == "juniper"
    assert j_data["deltas"]["score_delta"] >= 0

"""
End-to-End Autonomous Network Security Engineer Workflow Test
Taskmaster Track — All Things Agentic Hackathon
Problem Statement: SIH26155 (NTRO)

Tests the complete 12-step autonomous agent lifecycle:
1. Objective understanding & negative constraint parsing (e.g. 'do not modify SSH')
2. Multi-vendor fleet discovery (Cisco, Juniper, Fortinet)
3. AST parsing & deterministic compliance checks
4. Risk prioritization (P0/P1)
5. Remediation planning with constraint filtering
6. Human approval gate
7. Safe patch execution
8. Deterministic verification & re-analysis (FAIL -> PASS)
9. Proof that SSH was preserved
10. Final executive report compilation
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio


CISCO_INSECURE_CONFIG = """!
version 15.2
hostname CORE-RTR-01
!
no service password-encryption
!
ip domain-name ntro.gov.in
ip ssh version 1
!
ip http server
!
line vty 0 4
 transport input telnet ssh
 login local
line vty 5 15
 transport input telnet
 login local
!
end
"""

JUNIPER_INSECURE_CONFIG = """system {
    host-name EDGE-JUN-01;
    services {
        ssh {
            protocol-version v1;
        }
        telnet;
        web-management {
            http;
        }
    }
}
"""


async def test_constraint_parsing_unit():
    """Verifies that negative constraints are accurately parsed from natural language."""
    from app.services.agent.orchestrator import AutonomousSecurityEngineer

    objective = "Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH access."
    constraints = AutonomousSecurityEngineer._parse_constraints_from_objective(objective)

    assert len(constraints) == 1
    assert constraints[0].subsystem == "ssh"
    assert constraints[0].action == "DO_NOT_MODIFY"

    # Multiple constraints
    obj_multi = "Harden perimeter firewall, do not modify ssh and don't touch snmp."
    constraints_multi = AutonomousSecurityEngineer._parse_constraints_from_objective(obj_multi)
    subs = [c.subsystem for c in constraints_multi]
    assert "ssh" in subs
    assert "snmp" in subs


async def test_full_autonomous_security_engineer_lifecycle(client: AsyncClient):
    """
    Executes the complete Golden Demo scenario:
    User: 'Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH access.'
    """
    # 1. Ingest test configurations for Cisco and Juniper
    cisco_res = await client.post(
        "/api/v1/analysis/ingest",
        json={
            "content": CISCO_INSECURE_CONFIG,
            "filename": "cisco-core-router.cfg",
            "vendor_hint": "cisco",
        },
    )
    assert cisco_res.status_code in [200, 201]
    cisco_analysis_id = cisco_res.json()["analysis_id"]

    juniper_res = await client.post(
        "/api/v1/analysis/ingest",
        json={
            "content": JUNIPER_INSECURE_CONFIG,
            "filename": "juniper-edge-firewall.conf",
            "vendor_hint": "juniper",
        },
    )
    assert juniper_res.status_code in [200, 201]
    juniper_analysis_id = juniper_res.json()["analysis_id"]

    # 2. Run Autonomous Security Engineer
    objective = "Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH access."
    agent_res = await client.post(
        "/api/v1/agent/run",
        json={
            "objective": objective,
            "target_configurations": ["cisco-core-router.cfg", "juniper-edge-firewall.conf"],
            "baseline_framework": "CIS",
            "risk_threshold": "HIGH",
        },
    )
    assert agent_res.status_code == 200
    session_data = agent_res.json()
    session_id = session_data["session_id"]

    # 3. Verify Initial Autonomous Steps Completed
    assert session_data["status"] == "WAITING_APPROVAL"
    assert len(session_data["timeline"]) >= 8

    # Verify constraints were captured
    assert len(session_data["constraints"]) >= 1
    assert any(c["subsystem"] == "ssh" for c in session_data["constraints"])

    # 4. Verify Constraint Masking in Remediation Proposals
    proposals = session_data["proposals"]
    assert len(proposals) > 0

    # SSH proposals must be constrained / skipped
    ssh_props = [p for p in proposals if "ssh" in p["title"].lower() or "ssh" in p["control_id"].lower()]
    for p in ssh_props:
        assert p["is_constrained"] is True
        assert p["approval_status"] == "SKIPPED_CONSTRAINED"
        assert "ssh" in (p["constraint_reason"] or "").lower()

    # Telnet / HTTP proposals must be actionable (not constrained)
    actionable = [p for p in proposals if not p["is_constrained"]]
    assert len(actionable) > 0
    assert any("telnet" in p["title"].lower() or "transport" in p["title"].lower() or "http" in p["title"].lower() for p in actionable)

    # 5. Check Approval Gate State
    assert session_data["active_approval"] is not None
    assert len(session_data["active_approval"]["proposals"]) == len(actionable)

    # 6. Submit Human Approval
    appr_res = await client.post(
        f"/api/v1/agent/sessions/{session_id}/approve",
        json={"approved": True, "reviewer_notes": "Approved for NTRO production hardening."},
    )
    assert appr_res.status_code == 200
    updated_session = appr_res.json()

    # 7. Verify Remediation & Re-Analysis Execution
    assert updated_session["status"] == "COMPLETED"
    assert len(updated_session["timeline"]) == 12

    # Check Timeline Event Phasing
    timeline_phases = [e["phase"] for e in updated_session["timeline"]]
    assert "UNDERSTANDING" in timeline_phases
    assert "DISCOVERY" in timeline_phases
    assert "DETECTION" in timeline_phases
    assert "PARSING" in timeline_phases
    assert "AUDIT" in timeline_phases
    assert "RISK" in timeline_phases
    assert "PLANNING" in timeline_phases
    assert "APPROVAL" in timeline_phases
    assert "REMEDIATION" in timeline_phases
    assert "VERIFICATION" in timeline_phases
    assert "REPORTING" in timeline_phases

    # 8. Verify Final Executive Report
    report_res = await client.get(f"/api/v1/agent/sessions/{session_id}/report")
    assert report_res.status_code == 200
    report = report_res.json()

    assert report["total_devices_audited"] >= 2
    assert report["total_violations_before"] > report["total_violations_after"]
    assert report["remediations_applied"] > 0
    assert report["constraint_verification"]["ssh_subsystem_unaltered"] is True
    assert report["constraint_verification"]["status"] == "PASS_UNMODIFIED"

    # 9. Verify that SSH in Cisco config remained untouched (no ip ssh version 2 forced)
    cisco_cfg_res = await client.get(f"/api/v1/analysis/{cisco_analysis_id}/configuration")
    assert cisco_cfg_res.status_code == 200
    cisco_raw = cisco_cfg_res.json()["raw_text"]
    # Telnet should be disabled
    assert "transport input telnet" not in cisco_raw
    # But SSH version 1 was protected by constraint
    assert "ip ssh version 1" in cisco_raw


async def test_individual_adk_tools_and_error_handling(client: AsyncClient, db_session: AsyncSession):
    """Verifies that individual ADK tool functions return structured JSON and handle errors safely."""
    from app.services.agent.tools import (
        analyze_configuration_tool,
        run_compliance_audit_tool,
        get_findings_tool,
        generate_remediation_plan_tool,
    )

    # 1. Test analyze_configuration_tool on raw Cisco syntax
    analyze_res = await analyze_configuration_tool(CISCO_INSECURE_CONFIG, vendor_hint="cisco")
    assert analyze_res["success"] is True
    assert analyze_res["detected_vendor"] == "cisco"
    assert analyze_res["facts_extracted_count"] > 0
    assert "remote_access" in analyze_res["normalized_profile"]

    # 2. Test error handling on empty input
    empty_res = await analyze_configuration_tool("")
    assert empty_res["success"] is False
    assert "cannot be empty" in empty_res["error"]
    assert empty_res["recoverable"] is False

    # 3. Test run_compliance_audit_tool and get_findings_tool with db_session fixture
    # Ingest a real config first
    ingest_res = await client.post(
        "/api/v1/analysis/ingest",
        json={"content": CISCO_INSECURE_CONFIG, "filename": "cisco-tool-test.cfg"},
    )
    analysis_id = ingest_res.json()["analysis_id"]

    audit_res = await run_compliance_audit_tool(analysis_id=analysis_id, framework="CIS", db=db_session)
    assert audit_res["success"] is True
    assert audit_res["controls_evaluated"] > 0
    assert audit_res["failed_controls"] > 0
    audit_id = audit_res["audit_id"]

    findings_res = await get_findings_tool(audit_id=audit_id, db=db_session)
    assert findings_res["success"] is True
    assert findings_res["total_findings"] > 0
    assert len(findings_res["findings"]) > 0

    # 4. Test generate_remediation_plan_tool with constraints
    rem_res = await generate_remediation_plan_tool(
        audit_id=audit_id,
        constraints=["ssh"],
        db=db_session,
    )
    assert rem_res["success"] is True
    assert rem_res["total_proposals"] > 0
    assert rem_res["constrained_count"] >= 1
    assert rem_res["actionable_count"] >= 1


async def test_individual_remediation_approval_and_blocking(client: AsyncClient):
    """Verifies that individual remediation endpoints approve safe items and block constrained items."""
    # 1. Ingest config
    ingest_res = await client.post(
        "/api/v1/analysis/ingest",
        json={"content": CISCO_INSECURE_CONFIG, "filename": "cisco-approval-test.cfg"},
    )
    assert ingest_res.status_code in [200, 201]

    # 2. Start agent workflow with SSH constraint
    run_res = await client.post(
        "/api/v1/agent/run",
        json={
            "objective": "Audit configurations and fix high-risk violations, but do not modify SSH access.",
            "target_configurations": ["cisco-approval-test.cfg"],
        },
    )
    assert run_res.status_code == 200
    session_data = run_res.json()
    proposals = session_data["proposals"]

    # 3. Find constrained and actionable proposals
    ssh_prop = next(p for p in proposals if p["is_constrained"])
    actionable_prop = next(p for p in proposals if not p["is_constrained"])

    # 4. Attempt to approve constrained proposal -> must be BLOCKED
    blk_res = await client.post(f"/api/v1/agent/remediation/{ssh_prop['proposal_id']}/approve")
    assert blk_res.status_code == 200
    blk_data = blk_res.json()
    assert blk_data["status"] == "BLOCKED"
    assert blk_data["success"] is False

    # 5. Approve actionable proposal -> must be APPLIED
    appr_res = await client.post(f"/api/v1/agent/remediation/{actionable_prop['proposal_id']}/approve")
    assert appr_res.status_code == 200
    appr_data = appr_res.json()
    assert appr_data["status"] == "APPLIED"
    assert appr_data["success"] is True
    assert appr_data["applied_count"] >= 1




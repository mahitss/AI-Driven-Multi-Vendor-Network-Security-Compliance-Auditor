"""
Comprehensive Negative Constraint & SSH Protection Safety Test Suite
NetVigil — SIH26155 (NTRO)

Verifies all 10 Required Constraint Safety Tests:
- TEST 1: Explicit SSH constraint extracted from "Fix high-risk violations, but do not modify SSH access."
- TEST 2: SSH patch rejection (status == SKIPPED_CONSTRAINED and cannot reach approval queue)
- TEST 3: Mixed remediation (normal patches are eligible, SSH patches are SKIPPED_CONSTRAINED)
- TEST 4: No false guardrail state (reports SSH protection, never 'No negative user constraints')
- TEST 5: Server-side enforcement (rejects constrained SSH patches even if submitted to approval gate)
- TEST 6: Approval gate (constrained SSH patches cannot appear as approvable)
- TEST 7: Persistence (refresh/resume session preserves SSH constraint identically)
- TEST 8: New Objective (A's SSH constraint does not leak into B)
- TEST 9: Re-run (re-running SSH-protected objective reconstructs exact same constraint)
- TEST 10: Regression safety (full validation)
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.seed import seed_database_if_empty
from app.services.agent.classifier import ObjectiveClassifier
from app.services.agent.models import AgentConstraint, ProposedRemediationItem
from app.services.agent.tools import AgentToolLayer
from app.models.audit import Audit
from app.models.configuration import Configuration


@pytest.mark.asyncio
async def test_1_explicit_ssh_constraint_extraction():
    """TEST 1: Constraint extraction accurately identifies SSH protection from natural language."""
    inputs = [
        "Fix high-risk violations, but do not modify SSH access.",
        "Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH access.",
        "Harden network devices, protect SSH configuration.",
        "Fix high-risk violations without modifying SSH.",
        "Remediate security violations, leave SSH untouched.",
        "Fix high-risk violations, preserve SSH access.",
        "Harden fleet, keep SSH untouched.",
    ]
    for inp in inputs:
        res = ObjectiveClassifier.classify_objective(inp)
        assert len(res.user_constraints) >= 1
        ssh_constraints = [c for c in res.user_constraints if c.subsystem == "ssh"]
        assert len(ssh_constraints) == 1
        assert ssh_constraints[0].action == "DO_NOT_MODIFY"
        assert "SSH" in ssh_constraints[0].description


@pytest.mark.asyncio
async def test_2_ssh_patch_rejection_and_skip_constrained(db_session: AsyncSession):
    """TEST 2: SSH patches are marked SKIPPED_CONSTRAINED and requires_approval is False."""
    await seed_database_if_empty(db_session)
    audits = (await db_session.execute(select(Audit))).scalars().all()
    assert len(audits) > 0

    ssh_constraint = AgentConstraint(subsystem="ssh", action="DO_NOT_MODIFY")
    for audit in audits:
        proposals = await AgentToolLayer.generate_remediation_plan(
            audit_id=audit.id,
            constraints=[ssh_constraint],
            risk_threshold="HIGH",
            db=db_session,
        )
        for p in proposals:
            is_ssh = (
                any(kw in p.title.lower() for kw in ["ssh", "admin-ssh"])
                or any(cmd in p.commands.lower() for cmd in ["ip ssh", "admin-ssh", "system services ssh", "ssh protocol-version"])
            )
            if is_ssh:
                assert p.is_constrained is True
                assert p.approval_status == "SKIPPED_CONSTRAINED"
                assert p.requires_approval is False


@pytest.mark.asyncio
async def test_3_mixed_remediation_separation(db_session: AsyncSession):
    """TEST 3: Non-SSH patches remain PENDING while SSH patches are SKIPPED_CONSTRAINED."""
    await seed_database_if_empty(db_session)
    audits = (await db_session.execute(select(Audit))).scalars().all()
    ssh_constraint = AgentConstraint(subsystem="ssh", action="DO_NOT_MODIFY")

    all_proposals: list[ProposedRemediationItem] = []
    for audit in audits:
        props = await AgentToolLayer.generate_remediation_plan(
            audit_id=audit.id,
            constraints=[ssh_constraint],
            risk_threshold="HIGH",
            db=db_session,
        )
        all_proposals.extend(props)

    actionable = [p for p in all_proposals if not p.is_constrained]
    constrained = [p for p in all_proposals if p.is_constrained]

    assert len(actionable) > 0
    assert len(constrained) > 0
    for p in actionable:
        assert p.approval_status == "PENDING"
        assert p.requires_approval is True
        assert not any(kw in p.title.lower() or kw in p.commands.lower() for kw in ["ip ssh", "admin-ssh", "system services ssh", "ssh protocol-version"])
        assert not any(kw in p.title.lower() for kw in ["ssh", "admin-ssh"])
    for p in constrained:
        assert p.approval_status == "SKIPPED_CONSTRAINED"
        assert p.requires_approval is False


@pytest.mark.asyncio
async def test_4_no_false_guardrail_state(client: AsyncClient, db_session: AsyncSession):
    """TEST 4: API state reports active SSH protection and does NOT report zero constraints."""
    await seed_database_if_empty(db_session)
    objective = "Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH access."
    res = await client.post("/api/v1/agent/run", json={"objective": objective, "baseline_framework": "CIS"})
    assert res.status_code == 200
    data = res.json()

    assert len(data["constraints"]) >= 1
    assert any(c["subsystem"] == "ssh" for c in data["constraints"])
    step1 = data["timeline"][0]
    assert "Identified 1 operational constraint(s): SSH" in step1["summary"]
    assert "No negative user constraints specified" not in step1["summary"]


@pytest.mark.asyncio
async def test_5_server_side_constraint_enforcement(db_session: AsyncSession):
    """TEST 5: Server-side apply_approved_remediations strictly rejects prohibited SSH patches."""
    await seed_database_if_empty(db_session)
    cfgs = (await db_session.execute(select(Configuration))).scalars().all()
    assert len(cfgs) > 0
    target_id = cfgs[0].id

    # Forcibly create a malicious/forged SSH proposal marked as APPROVED
    forged_ssh_patch = ProposedRemediationItem(
        proposal_id="prop_forged_ssh_01",
        analysis_id=target_id,
        device_name="core-router",
        vendor="cisco",
        finding_id="find_01",
        control_id="CIS-1.1",
        framework="CIS",
        title="Enforce SSH Version 2 with Cryptographic Key Generation",
        severity="HIGH",
        is_constrained=False,  # Client attempted to bypass
        commands="configure terminal\nip ssh version 2\nend",
        potential_impact="Protocol configuration update",
        requires_approval=True,
        approval_status="APPROVED",
    )

    ssh_constraint = AgentConstraint(subsystem="ssh", action="DO_NOT_MODIFY")
    new_text, applied_count, logs = await AgentToolLayer.apply_approved_remediations(
        analysis_id=target_id,
        proposals=[forged_ssh_patch],
        db=db_session,
        constraints=[ssh_constraint],
    )

    # Must be blocked by server-side constraint gate
    assert applied_count == 0
    assert len(logs) == 0
    assert "ip ssh version 2" not in new_text


@pytest.mark.asyncio
async def test_6_approval_gate_filters_constrained_patches(client: AsyncClient, db_session: AsyncSession):
    """TEST 6: WAITING_APPROVAL session active proposals exclude constrained items."""
    await seed_database_if_empty(db_session)
    objective = "Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH access."
    res = await client.post("/api/v1/agent/run", json={"objective": objective, "baseline_framework": "CIS"})
    assert res.status_code == 200
    data = res.json()

    proposals = data["proposals"]
    actionable_proposals = [p for p in proposals if not p["is_constrained"]]
    constrained_proposals = [p for p in proposals if p["is_constrained"]]

    assert len(constrained_proposals) >= 3
    for cp in constrained_proposals:
        assert cp["approval_status"] == "SKIPPED_CONSTRAINED"
        assert cp["requires_approval"] is False

    # Execute Approval
    approve_res = await client.post(
        f"/api/v1/agent/sessions/{data['session_id']}/approve",
        json={"approved": True, "approval_token": data["active_approval"]["approval_token"]},
    )
    assert approve_res.status_code == 200
    completed = approve_res.json()
    assert completed["status"] == "COMPLETED"

    # Verify report confirms constrained count
    report = completed["final_report"]
    assert report["remediations_constrained"] >= 3


@pytest.mark.asyncio
async def test_7_session_persistence_preserves_ssh_constraint(client: AsyncClient, db_session: AsyncSession):
    """TEST 7: Retrieving session from storage retains SSH constraint identically."""
    await seed_database_if_empty(db_session)
    objective = "Fix high-risk violations, but do not modify SSH access."
    res = await client.post("/api/v1/agent/run", json={"objective": objective, "baseline_framework": "CIS"})
    session_id = res.json()["session_id"]

    get_res = await client.get(f"/api/v1/agent/sessions/{session_id}")
    assert get_res.status_code == 200
    fetched = get_res.json()

    assert len(fetched["constraints"]) == 1
    assert fetched["constraints"][0]["subsystem"] == "ssh"
    assert fetched["constraints"][0]["action"] == "DO_NOT_MODIFY"


@pytest.mark.asyncio
async def test_8_new_objective_zero_constraint_leak(client: AsyncClient, db_session: AsyncSession):
    """TEST 8: A's SSH constraint does not leak into a new unrestricted session B."""
    await seed_database_if_empty(db_session)
    # Run Session A with SSH constraint
    res_a = await client.post("/api/v1/agent/run", json={
        "objective": "Fix high-risk violations, but do not modify SSH access.",
        "baseline_framework": "CIS",
    })
    data_a = res_a.json()
    assert len(data_a["constraints"]) == 1

    # Run Session B without constraints
    res_b = await client.post("/api/v1/agent/run", json={
        "objective": "Audit these network configurations and fix high-risk violations.",
        "baseline_framework": "CIS",
    })
    data_b = res_b.json()
    assert len(data_b["constraints"]) == 0
    assert data_a["session_id"] != data_b["session_id"]


@pytest.mark.asyncio
async def test_9_rerun_objective_reconstructs_identical_constraint(client: AsyncClient, db_session: AsyncSession):
    """TEST 9: Re-running the objective reconstructs the exact same constraint state."""
    await seed_database_if_empty(db_session)
    obj = "Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH access."
    r1 = await client.post("/api/v1/agent/run", json={"objective": obj, "baseline_framework": "CIS"})
    r2 = await client.post("/api/v1/agent/run", json={"objective": obj, "baseline_framework": "CIS"})

    d1 = r1.json()
    d2 = r2.json()

    assert d1["session_id"] != d2["session_id"]
    assert d1["constraints"] == d2["constraints"]
    assert d1["constraints"][0]["subsystem"] == "ssh"


@pytest.mark.asyncio
async def test_10_complete_golden_path_with_negative_constraint(client: AsyncClient, db_session: AsyncSession):
    """TEST 10: Full lifecycle execution strictly preserves SSH across all 12 stages."""
    await seed_database_if_empty(db_session)
    objective = "Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH access."
    
    # 1. Start Run
    run_res = await client.post("/api/v1/agent/run", json={"objective": objective, "baseline_framework": "CIS"})
    assert run_res.status_code == 200
    session_data = run_res.json()
    assert session_data["status"] == "WAITING_APPROVAL"
    assert len(session_data["constraints"]) == 1
    assert session_data["constraints"][0]["subsystem"] == "ssh"

    # Verify proposals
    for p in session_data["proposals"]:
        if "ssh" in p["title"].lower() or "admin-ssh" in p["title"].lower() or "ip ssh" in p["commands"].lower():
            assert p["is_constrained"] is True
            assert p["approval_status"] == "SKIPPED_CONSTRAINED"

    # 2. Approve
    token = session_data["active_approval"]["approval_token"]
    app_res = await client.post(
        f"/api/v1/agent/sessions/{session_data['session_id']}/approve",
        json={"approved": True, "approval_token": token},
    )
    assert app_res.status_code == 200
    final_data = app_res.json()
    assert final_data["status"] == "COMPLETED"
    
    # 3. Verify configurations in DB: zero SSH changes applied
    cfgs = (await db_session.execute(select(Configuration))).scalars().all()
    for c in cfgs:
        if c.detected_vendor == "cisco":
            # Baseline had no 'ip ssh version 2', ensure it was NOT added
            assert "ip ssh version 2" not in (c.raw_content or "")
        elif c.detected_vendor == "fortinet":
            # Baseline had admin-ssh-v1 enable, ensure it was NOT modified
            assert "set admin-ssh-v1 disable" not in (c.raw_content or "")

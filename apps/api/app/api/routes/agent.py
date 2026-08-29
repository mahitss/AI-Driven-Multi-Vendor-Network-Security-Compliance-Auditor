"""
Autonomous Network Security Engineer REST API Routes
Taskmaster Track — All Things Agentic Hackathon
Problem Statement: SIH26155 (NTRO)
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, Depends, Path, status
from pydantic import BaseModel, Field

from app.api.dependencies import DatabaseDep
from app.core.errors import ResourceNotFoundError, ValidationError
from app.services.agent.models import (
    AgentObjectiveRequest,
    AgentSessionState,
    FinalExecutiveReport,
)
from app.services.agent.orchestrator import AutonomousSecurityEngineer
from app.services.agent.memory import AgentMemoryManager
from app.services.agent.tools import AgentToolLayer

router = APIRouter(prefix="/agent", tags=["Autonomous Network Security Engineer"])


class ApprovalSubmission(BaseModel):
    """Payload for submitting human approval decision."""
    approved: bool = Field(..., description="True to approve and apply remediation, False to reject")
    reviewer_notes: Optional[str] = Field(default=None, description="Optional security administrator notes")


@router.post(
    "/run",
    response_model=AgentSessionState,
    status_code=status.HTTP_200_OK,
    summary="Start an autonomous security engineering workflow for a natural language objective",
)
async def start_agent_workflow(
    payload: AgentObjectiveRequest,
    db: DatabaseDep,
) -> AgentSessionState:
    """
    Step 1-8 of Autonomous Engineering Lifecycle:
    - Parses operator objective & negative constraints (e.g. 'do not modify SSH')
    - Discovers fleet device configurations (Cisco, Juniper, Fortinet)
    - Runs deterministic AST parsing & multi-framework compliance checks
    - Prioritizes risk (P0/P1) and prepares allowlisted remediation plan
    - Pauses at Human Approval Gate
    """
    if not payload.objective.strip():
        raise ValidationError(message="Objective cannot be empty.")

    session = await AutonomousSecurityEngineer.start_autonomous_run(
        request=payload,
        db=db,
    )
    return session


@router.get(
    "/sessions/{session_id}",
    response_model=AgentSessionState,
    summary="Retrieve real-time execution state and timeline events for an agent session",
)
async def get_agent_session_state(
    session_id: str = Path(..., description="Unique agent session ID"),
) -> AgentSessionState:
    """Fetches session timeline, discovered devices, and pending approval state."""
    session = await AgentMemoryManager.get_session(session_id)
    if not session:
        raise ResourceNotFoundError(resource="AgentSession", identifier=session_id)
    return session


@router.post(
    "/sessions/{session_id}/approve",
    response_model=AgentSessionState,
    summary="Submit human administrator approval to execute remediations and proceed to verification",
)
async def submit_remediation_approval(
    session_id: str,
    submission: ApprovalSubmission,
    db: DatabaseDep,
) -> AgentSessionState:
    """
    Step 9-12 of Autonomous Engineering Lifecycle:
    - Applies approved remediation patches to configuration text
    - Re-parses AST and re-runs deterministic compliance engine
    - Verifies findings transition from FAIL to PASS
    - Proves constraints (e.g. SSH untouched) were preserved
    - Generates final executive report
    """
    session = await AgentMemoryManager.get_session(session_id)
    if not session:
        raise ResourceNotFoundError(resource="AgentSession", identifier=session_id)

    updated_session = await AutonomousSecurityEngineer.process_approval_and_continue(
        session_id=session_id,
        approved=submission.approved,
        db=db,
    )
    return updated_session


@router.get(
    "/sessions/{session_id}/report",
    response_model=FinalExecutiveReport,
    summary="Retrieve final executive security and verification report",
)
async def get_agent_final_report(
    session_id: str,
) -> FinalExecutiveReport:
    """Retrieves verified before/after audit delta and executive report."""
    session = await AgentMemoryManager.get_session(session_id)
    if not session:
        raise ResourceNotFoundError(resource="AgentSession", identifier=session_id)
    if not session.final_report:
        raise ValidationError(message="Final report is not yet compiled. Complete the remediation verification step first.")
    return session.final_report


@router.get(
    "/configurations",
    summary="List fleet configurations available for autonomous agent targeting",
)
async def list_agent_configurations(
    db: DatabaseDep,
) -> List[Dict[str, Any]]:
    """Lists device configurations stored in inventory."""
    return await AgentToolLayer.discover_configurations(db)


@router.get(
    "/sessions",
    response_model=List[AgentSessionState],
    summary="List recent autonomous agent sessions",
)
async def list_recent_agent_sessions() -> List[AgentSessionState]:
    """Lists previous agent execution sessions."""
    return await AgentMemoryManager.list_recent_sessions(limit=10)


@router.post(
    "/remediation/{proposal_id}/approve",
    summary="Approve an individual proposed remediation item",
)
async def approve_individual_remediation(
    proposal_id: str,
    db: DatabaseDep,
) -> Dict[str, Any]:
    """Approves an individual remediation proposal and applies patch."""
    match = await AgentMemoryManager.find_proposal(proposal_id)
    if not match:
        raise ResourceNotFoundError(resource="RemediationProposal", identifier=proposal_id)
    session, proposal = match

    if proposal.is_constrained:
        return {
            "success": False,
            "status": "BLOCKED",
            "message": proposal.constraint_reason or "Proposal is blocked by operator constraint.",
        }

    proposal.approval_status = "APPROVED"
    # Apply single patch
    _, count, logs = await AgentToolLayer.apply_approved_remediations(
        analysis_id=proposal.analysis_id,
        proposals=[proposal],
        db=db,
    )
    await AgentMemoryManager.save_session(session)
    return {
        "success": True,
        "proposal_id": proposal_id,
        "status": "APPLIED",
        "applied_count": count,
        "logs": logs,
    }


@router.post(
    "/remediation/{proposal_id}/reject",
    summary="Reject an individual proposed remediation item",
)
async def reject_individual_remediation(
    proposal_id: str,
) -> Dict[str, Any]:
    """Rejects an individual remediation proposal."""
    match = await AgentMemoryManager.find_proposal(proposal_id)
    if not match:
        raise ResourceNotFoundError(resource="RemediationProposal", identifier=proposal_id)
    session, proposal = match

    proposal.approval_status = "REJECTED"
    await AgentMemoryManager.save_session(session)
    return {
        "success": True,
        "proposal_id": proposal_id,
        "status": "REJECTED",
        "message": f"Proposal {proposal_id} was rejected by operator.",
    }


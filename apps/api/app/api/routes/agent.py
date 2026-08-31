"""
Autonomous Network Security Engineer REST API Routes
Taskmaster Track — All Things Agentic Hackathon
Problem Statement: SIH26155 (NTRO)
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, Depends, Path, status
from pydantic import BaseModel, Field

from app.api.dependencies import CurrentUserDep, DatabaseDep
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
    approval_token: Optional[str] = Field(default=None, description="Optional security token from approval request")
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
    current_user: CurrentUserDep,
) -> AgentSessionState:
    """
    Step 1-8 of Autonomous Engineering Lifecycle:
    - Parses operator objective & negative constraints (e.g. 'do not modify SSH')
    - Discovers fleet device configurations for current user
    - Runs deterministic AST parsing & multi-framework compliance checks
    - Prioritizes risk (P0/P1) and prepares allowlisted remediation plan
    - Pauses at Human Approval Gate
    """
    if not payload.objective.strip():
        raise ValidationError(message="Objective cannot be empty.")

    session = await AutonomousSecurityEngineer.start_autonomous_run(
        request=payload,
        db=db,
        user_id=current_user.id,
    )
    return session


async def _get_session_by_id(target_id: str, user_id: Optional[str] = None) -> AgentSessionState:
    session = await AgentMemoryManager.get_session(target_id, user_id=user_id)
    if not session:
        raise ResourceNotFoundError(resource="AgentSession", identifier=target_id)
    return session


@router.get(
    "/sessions/{session_id}",
    response_model=AgentSessionState,
    summary="Retrieve real-time execution state and timeline events for an agent session",
)
async def get_agent_session_state(
    session_id: str = Path(..., description="Unique agent session ID"),
    current_user: CurrentUserDep = None,
) -> AgentSessionState:
    """Fetches session timeline, discovered devices, and pending approval state for current user."""
    return await _get_session_by_id(session_id, user_id=current_user.id if current_user else None)


@router.get(
    "/executions/{execution_id}",
    response_model=AgentSessionState,
    summary="Retrieve real-time execution state by execution ID (alias)",
)
async def get_agent_execution_state(
    execution_id: str = Path(..., description="Unique agent execution ID"),
    current_user: CurrentUserDep = None,
) -> AgentSessionState:
    """Fetches execution timeline and state by execution ID alias for current user."""
    return await _get_session_by_id(execution_id, user_id=current_user.id if current_user else None)


@router.post(
    "/sessions/{session_id}/approve",
    response_model=AgentSessionState,
    summary="Submit human administrator approval to execute remediations and proceed to verification",
)
async def submit_remediation_approval(
    session_id: str,
    submission: ApprovalSubmission,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> AgentSessionState:
    """
    Step 9-12 of Autonomous Engineering Lifecycle:
    - Applies approved remediation patches to configuration text
    - Re-parses AST and re-runs deterministic compliance engine
    - Verifies findings transition from FAIL to PASS
    - Proves constraints (e.g. SSH untouched) were preserved
    - Generates final executive report
    """
    session = await AgentMemoryManager.get_session(session_id, user_id=current_user.id)
    if not session:
        raise ResourceNotFoundError(resource="AgentSession", identifier=session_id)

    updated_session = await AutonomousSecurityEngineer.process_approval_and_continue(
        session_id=session_id,
        approved=submission.approved,
        db=db,
        approval_token=submission.approval_token,
    )
    return updated_session


@router.get(
    "/sessions/{session_id}/report",
    response_model=FinalExecutiveReport,
    summary="Retrieve final executive security and verification report",
)
async def get_agent_final_report(
    session_id: str,
    current_user: CurrentUserDep,
) -> FinalExecutiveReport:
    """Retrieves verified before/after audit delta and executive report for current user."""
    session = await AgentMemoryManager.get_session(session_id, user_id=current_user.id)
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
    current_user: CurrentUserDep,
) -> List[Dict[str, Any]]:
    """Lists device configurations stored in inventory for current user."""
    return await AgentToolLayer.discover_configurations(db, user_id=current_user.id)


@router.get(
    "/sessions",
    response_model=List[AgentSessionState],
    summary="List recent autonomous agent sessions",
)
async def list_recent_agent_sessions(current_user: CurrentUserDep) -> List[AgentSessionState]:
    """Lists previous agent execution sessions for current user."""
    return await AgentMemoryManager.list_recent_sessions(limit=10, user_id=current_user.id)


@router.post(
    "/remediation/{proposal_id}/approve",
    summary="Approve an individual proposed remediation item",
)
async def approve_individual_remediation(
    proposal_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> Dict[str, Any]:
    """Approves an individual remediation proposal and applies patch."""
    match = await AgentMemoryManager.find_proposal(proposal_id)
    if not match:
        raise ResourceNotFoundError(resource="RemediationProposal", identifier=proposal_id)
    session, proposal = match

    if session.user_id and session.user_id != current_user.id:
        raise ResourceNotFoundError(resource="RemediationProposal", identifier=proposal_id)

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
    current_user: CurrentUserDep,
) -> Dict[str, Any]:
    """Rejects an individual remediation proposal."""
    match = await AgentMemoryManager.find_proposal(proposal_id)
    if not match:
        raise ResourceNotFoundError(resource="RemediationProposal", identifier=proposal_id)
    session, proposal = match

    if session.user_id and session.user_id != current_user.id:
        raise ResourceNotFoundError(resource="RemediationProposal", identifier=proposal_id)

    proposal.approval_status = "REJECTED"
    await AgentMemoryManager.save_session(session)
    return {
        "success": True,
        "proposal_id": proposal_id,
        "status": "REJECTED",
        "message": f"Proposal {proposal_id} was rejected by operator.",
    }


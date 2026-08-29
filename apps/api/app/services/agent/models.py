"""
Autonomous Network Security Engineer Data Models & Schemas
Taskmaster Track — All Things Agentic Hackathon
Problem Statement: SIH26155 (NTRO)
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AgentConstraint(BaseModel):
    """Negative or positive constraint specified in operator objective."""
    subsystem: str = Field(..., description="Target subsystem (e.g., 'ssh', 'snmp', 'bgp', 'ntp')")
    action: str = Field(default="DO_NOT_MODIFY", description="Constraint action: 'DO_NOT_MODIFY', 'ENFORCE_ONLY', 'SKIP'")
    description: str = Field(default="", description="Human-readable constraint explanation")


class AgentObjectiveRequest(BaseModel):
    """User objective input to autonomous network security engineer."""
    objective: str = Field(..., description="Natural language security objective")
    target_configurations: Optional[List[str]] = Field(default=None, description="Optional target configuration filenames or analysis IDs")
    baseline_framework: str = Field(default="CIS", description="Target compliance standard (CIS, NIST, STIG, ISO)")
    risk_threshold: str = Field(default="HIGH", description="Remediation focus threshold (CRITICAL, HIGH, ALL)")
    auto_approve_safe: bool = Field(default=False, description="Whether to auto-apply low-impact changes without human prompt")


class TimelineEvent(BaseModel):
    """Discrete step in the autonomous agent execution timeline."""
    step_id: str
    step_number: int
    title: str
    phase: str  # "UNDERSTANDING", "DISCOVERY", "DETECTION", "PARSING", "AUDIT", "RISK", "PLANNING", "APPROVAL", "REMEDIATION", "VERIFICATION", "REPORTING"
    status: str  # "PENDING", "RUNNING", "COMPLETED", "WAITING_APPROVAL", "REJECTED", "FAILED"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    details: Dict[str, Any] = Field(default_factory=dict)
    summary: str = ""


class ProposedRemediationItem(BaseModel):
    """Structured remediation proposal evaluated by the agent."""
    proposal_id: str
    analysis_id: str
    device_name: str
    vendor: str
    finding_id: str
    control_id: str
    framework: str
    title: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    is_constrained: bool = False
    constraint_reason: Optional[str] = None
    commands: str
    rollback_commands: Optional[str] = None
    diff_preview: Dict[str, Any] = Field(default_factory=dict)
    potential_impact: str
    requires_approval: bool = True
    approval_status: str = "PENDING"  # "PENDING", "APPROVED", "REJECTED", "SKIPPED_CONSTRAINED"


class ApprovalRequest(BaseModel):
    """Interactive approval gate payload."""
    approval_token: str
    session_id: str
    proposals: List[ProposedRemediationItem]
    constrained_items_count: int
    impact_summary: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class VerificationTransition(BaseModel):
    """Before/after verification state for a specific security finding."""
    control_id: str
    title: str
    framework: str
    previous_status: str  # "FAIL"
    new_status: str  # "PASS"
    resolved: bool
    evidence_verified: str


class DeviceAuditSummary(BaseModel):
    """Summary of audit and remediation for a single device configuration."""
    analysis_id: str
    device_name: str
    vendor: str
    hash_before: str
    hash_after: Optional[str] = None
    compliance_score_before: float
    compliance_score_after: Optional[float] = None
    fail_count_before: int
    fail_count_after: Optional[int] = None
    risk_score_before: float
    risk_score_after: Optional[float] = None
    remediations_applied_count: int = 0
    transitions: List[VerificationTransition] = Field(default_factory=list)


class FinalExecutiveReport(BaseModel):
    """Comprehensive executive security and remediation report."""
    report_id: str
    session_id: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    objective: str
    baseline_framework: str
    constraints_honored: List[str]
    total_devices_audited: int
    total_controls_evaluated: int
    total_violations_before: int
    total_violations_after: int
    high_risk_before: int
    high_risk_after: int
    remediations_applied: int
    remediations_rejected: int
    remediations_constrained: int
    constraint_verification: Dict[str, Any]
    device_summaries: List[DeviceAuditSummary]
    overall_posture_delta: str


class AgentSessionState(BaseModel):
    """Complete persistent state of an autonomous agent execution session."""
    session_id: str
    objective: str
    status: str  # "INITIALIZING", "RUNNING", "WAITING_APPROVAL", "COMPLETED", "REJECTED", "FAILED"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    constraints: List[AgentConstraint] = Field(default_factory=list)
    timeline: List[TimelineEvent] = Field(default_factory=list)
    discovered_configs: List[Dict[str, Any]] = Field(default_factory=list)
    proposals: List[ProposedRemediationItem] = Field(default_factory=list)
    active_approval: Optional[ApprovalRequest] = None
    verification_results: Dict[str, Any] = Field(default_factory=dict)
    final_report: Optional[FinalExecutiveReport] = None
    error: Optional[str] = None

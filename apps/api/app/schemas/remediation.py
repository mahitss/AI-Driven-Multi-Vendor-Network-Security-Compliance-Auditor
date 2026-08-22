"""
Remediation Proposal Pydantic Schemas
Problem Statement: SIH26155 (NTRO)
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class RemediationProposalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    audit_id: str
    finding_id: Optional[str] = None
    risk_id: Optional[str] = None
    vendor: str
    platform: Optional[str] = None
    normalized_control: str
    title: str
    status: str
    remediation_commands: str
    rollback_commands: Optional[str] = None
    diff_preview: Optional[Dict[str, Any]] = None
    why_recommended: str
    potential_impact: str
    verification_steps: str
    template_id: str
    template_version: str
    confidence: float
    is_reviewed: bool
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ReviewRemediationRequest(BaseModel):
    reviewer_email: Optional[str] = "admin@ntro.gov.in"
    notes: Optional[str] = "Verified and approved by network security officer"


class RemediationSummaryStatsResponse(BaseModel):
    total_proposals: int
    available_count: int
    reviewed_count: int
    not_available_count: int

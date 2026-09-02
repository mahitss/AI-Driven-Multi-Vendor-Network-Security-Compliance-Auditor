"""
Remediation Proposal Pydantic Schemas
Problem Statement: SIH26155 (NTRO)
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


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
    reviewer_email: Optional[str] = Field(default="admin@ntro.gov.in", max_length=255)
    reviewed_by: Optional[str] = Field(default=None, max_length=150)
    status: Optional[str] = Field(default="REVIEWED", max_length=50)
    notes: Optional[str] = Field(default="Verified and approved by network security officer", max_length=2000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return "REVIEWED"
        allowed = {"REVIEWED", "APPROVED", "REJECTED", "DISMISSED"}
        if v.upper() not in allowed:
            raise ValueError(f"Invalid remediation status '{v}'. Allowed: {', '.join(sorted(allowed))}")
        return v.upper()


class RemediationSummaryStatsResponse(BaseModel):
    total_proposals: int
    available_count: int
    reviewed_count: int
    not_available_count: int

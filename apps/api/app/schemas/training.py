"""
Adaptive Training Schemas
Problem Statement: SIH26155 (NTRO)
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class CreateMappingRequest(BaseModel):
    vendor: str = Field(..., min_length=2, max_length=100)
    platform: Optional[str] = Field(default=None, max_length=100)
    raw_pattern: str = Field(..., min_length=1, max_length=500)
    normalized_pattern: Optional[str] = Field(default=None, max_length=500)
    candidate_property: str = Field(..., min_length=3, max_length=150)
    candidate_value: Any = Field(default=True)
    semantic_meaning: str = Field(..., min_length=3, max_length=500)
    category: str = Field(default="remote_access", max_length=100)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    status: str = Field(default="APPROVED", max_length=50)  # PENDING, APPROVED, REJECTED

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"PENDING", "APPROVED", "REJECTED"}
        if v.upper() not in allowed:
            raise ValueError(f"Invalid mapping status '{v}'. Allowed: {', '.join(sorted(allowed))}")
        return v.upper()


class ApproveMappingRequest(BaseModel):
    user_email: Optional[str] = Field(default="admin@ntro.gov.in", max_length=255)


class EditMappingRequest(BaseModel):
    candidate_property: str = Field(..., min_length=3, max_length=150)
    candidate_value: Any = Field(default=True)
    semantic_meaning: str = Field(..., min_length=3, max_length=500)
    category: str = Field(default="remote_access", max_length=100)
    normalized_pattern: Optional[str] = Field(default=None, max_length=500)
    reason: Optional[str] = Field(default=None, max_length=1000)
    user_email: Optional[str] = Field(default="admin@ntro.gov.in", max_length=255)


class RejectMappingRequest(BaseModel):
    reason: Optional[str] = Field(default="Rejected by security administrator", max_length=1000)
    user_email: Optional[str] = Field(default="admin@ntro.gov.in", max_length=255)


class TrainingMappingResponse(BaseModel):
    id: str
    vendor: str
    platform: Optional[str] = None
    raw_pattern: str
    normalized_pattern: Optional[str] = None
    candidate_property: str
    candidate_value: Any = None
    semantic_meaning: str
    category: str
    confidence: float
    status: str
    source: str
    rejection_reason: Optional[str] = None
    created_by_email: Optional[str] = None
    version: int
    usage_count: int
    last_used_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class TrainingAuditTrailResponse(BaseModel):
    id: str
    mapping_id: str
    action: str
    user_email: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    created_at: datetime


class TrainingStatsResponse(BaseModel):
    pending_count: int
    approved_count: int
    rejected_count: int
    disabled_count: int
    total_mappings: int
    vendors_learned_count: int
    vendors_learned: List[str]


class FindingTransition(BaseModel):
    framework: str
    control_id: str
    title: str
    previous_status: str
    new_status: str
    severity: str
    actual_value: Optional[Any] = None


class TrainingImpactResponse(BaseModel):
    configuration_id: str
    audit_id: str
    previous_score: float
    new_score: float
    score_delta: float
    previous_unknown_directives: int
    new_unknown_directives: int
    resolved_directives_count: int
    evaluated_controls_count: int
    finding_transitions: List[FindingTransition]
    mappings_applied_count: int
    reanalyzed_at: str


class AllowlistPropertyResponse(BaseModel):
    property: str
    type: str
    category: str
    description: str

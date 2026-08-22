"""
Adaptive Training Schemas
Problem Statement: SIH26155 (NTRO)
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CreateMappingRequest(BaseModel):
    vendor: str = Field(..., min_length=2, max_length=100)
    platform: Optional[str] = None
    raw_pattern: str = Field(..., min_length=1)
    normalized_pattern: Optional[str] = None
    candidate_property: str = Field(..., min_length=3)
    candidate_value: Any = Field(default=True)
    semantic_meaning: str = Field(..., min_length=3)
    category: str = Field(default="remote_access")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    status: str = Field(default="APPROVED")  # PENDING or APPROVED


class ApproveMappingRequest(BaseModel):
    user_email: Optional[str] = "admin@ntro.gov.in"


class EditMappingRequest(BaseModel):
    candidate_property: str = Field(..., min_length=3)
    candidate_value: Any = Field(default=True)
    semantic_meaning: str = Field(..., min_length=3)
    category: str = Field(default="remote_access")
    normalized_pattern: Optional[str] = None
    reason: Optional[str] = None
    user_email: Optional[str] = "admin@ntro.gov.in"


class RejectMappingRequest(BaseModel):
    reason: Optional[str] = "Rejected by security administrator"
    user_email: Optional[str] = "admin@ntro.gov.in"


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

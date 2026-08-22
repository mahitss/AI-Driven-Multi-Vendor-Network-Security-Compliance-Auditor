"""
AI Intelligence Pydantic Schemas
Problem Statement: SIH26155 (NTRO)
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class FindingExplanationResponse(BaseModel):
    summary: str = Field(..., description="High-level finding summary")
    why_it_matters: str = Field(..., description="Operational & security impact")
    technical_explanation: str = Field(..., description="In-depth technical analysis")
    risk_context: str = Field(..., description="Potential exploit/attack vectors")
    recommended_action: str = Field(..., description="Recommended vendor CLI remediation")
    confidence: float = Field(default=0.90, ge=0.0, le=1.0)
    evidence_used: List[str] = Field(default_factory=list)
    source_lines: List[int] = Field(default_factory=list)
    disclaimer: str = Field(
        default="AI-assisted explanation grounded in verified audit evidence. Verify CLI commands before applying."
    )


class AuditAssistantQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500, description="Natural language question about the audit")
    audit_id: Optional[str] = Field(None, description="Audit session ID")


class AuditAssistantQueryResponse(BaseModel):
    query: str
    audit_id: str
    answer: str
    supporting_findings: List[str] = Field(
        default_factory=list, description="IDs or Control IDs of findings supporting this answer"
    )
    confidence: float = Field(default=0.95, ge=0.0, le=1.0)
    sources_count: int = 0


class UnknownConfigInterpretationRequest(BaseModel):
    raw_command: str = Field(..., min_length=1, max_length=1000)
    vendor_hint: str = Field(default="cisco")
    platform_hint: Optional[str] = None
    nearby_context: Optional[List[str]] = Field(default_factory=list)


class UnknownConfigInterpretationResponse(BaseModel):
    status: str = Field(default="candidate", description="'candidate' | 'uncertain' | 'unsupported'")
    normalized_category: str = Field(..., description="e.g. remote_access, authentication, logging")
    semantic_meaning: str = Field(..., description="Human-readable meaning of the command")
    candidate_property: Optional[str] = Field(None, description="Normalized field name candidate")
    candidate_value: Any = Field(None, description="Parsed canonical value")
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning_summary: str = Field(..., description="Why the model selected this category")
    evidence: List[str] = Field(default_factory=list)
    alternative_interpretations: List[str] = Field(default_factory=list)
    confidence_tier: str = Field(default="review", description="'high' (>=0.90) | 'review' (0.70-0.89) | 'low' (<0.70)")


class AIHealthResponse(BaseModel):
    provider: str
    model: str
    status: str
    has_api_key: bool
    temperature: float
    timeout_seconds: int

"""
Compliance Audit API Schemas
Problem Statement: SIH26155 (NTRO)
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CreateAuditRequest(BaseModel):
    configuration_id: str = Field(..., description="Unique ID of configuration to audit")
    frameworks: Optional[List[str]] = Field(
        default=["CIS", "NIST", "STIG", "ISO"],
        description="List of frameworks to evaluate (CIS, NIST, STIG, ISO)",
    )


class FrameworkScoreResponse(BaseModel):
    framework: str
    score: float
    passed_count: int
    failed_count: int
    unknown_count: int
    not_applicable_count: int
    total_applicable: int
    total_evaluated: int


class SeverityStatsResponse(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class FindingResponse(BaseModel):
    id: str
    audit_id: str
    configuration_id: Optional[str] = None
    device_name: Optional[str] = None
    vendor: Optional[str] = None
    framework: str
    control_id: str
    category: Optional[str] = None
    status: str
    severity: str
    title: str
    description: Optional[str] = None
    evidence: Optional[str] = None
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None
    remediation: Optional[str] = None
    finding_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditResponse(BaseModel):
    id: str
    configuration_id: str
    device_id: Optional[str] = None
    status: str
    score: Optional[float] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    summary_stats: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class AuditDetailResponse(AuditResponse):
    framework_scores: Dict[str, FrameworkScoreResponse] = Field(default_factory=dict)
    severity_breakdown: SeverityStatsResponse = Field(default_factory=SeverityStatsResponse)
    status_breakdown: Dict[str, int] = Field(default_factory=dict)
    findings: List[FindingResponse] = Field(default_factory=list)


class AuditSummaryResponse(BaseModel):
    audit_id: str
    configuration_id: str
    overall_score: float
    status: str
    frameworks: Dict[str, float]
    summary: SeverityStatsResponse
    status_counts: Dict[str, int]
    completed_at: Optional[datetime] = None


class FrameworkMetadataResponse(BaseModel):
    framework: str
    name: str
    version: str
    description: str
    document_reference: Optional[str] = None
    source_type: str = "official"
    verified: bool = True


class LatestAuditResponse(BaseModel):
    audit_id: str
    configuration_id: str
    filename: str
    sha256: str
    vendor: str
    vendor_confidence: float = 0.98
    compliance_score: float
    risk_score: float
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    info_count: int = 0
    findings_count: int = 0
    open_findings: int = 0
    total_configurations: int = 0
    total_devices: int = 0
    created_at: datetime
    completed_at: Optional[datetime] = None
    controls_count: int = 0

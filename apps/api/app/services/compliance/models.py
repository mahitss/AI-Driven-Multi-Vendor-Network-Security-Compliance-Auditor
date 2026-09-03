"""
Compliance Engine Domain Models & Rule Definitions
Problem Statement: SIH26155 (NTRO)
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class EvaluationStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    PARTIAL = "PARTIAL"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    UNKNOWN = "UNKNOWN"


class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class FrameworkSourceMeta(BaseModel):
    control_id: str
    title: str
    document: str
    version: str
    reference: str
    verified: bool = True
    source_type: str = "official"


class ComplianceRule(BaseModel):
    """Data-driven rule definition evaluating normalized security facts."""

    id: str
    normalized_control_id: str
    title: str
    description: str
    category: str
    severity: SeverityLevel
    fact_path: str
    operator: str
    expected_value: Any
    explanation: str
    remediation_key: str
    applicability: Optional[Any] = None
    absence_compliant: bool = False
    framework_mappings: Dict[str, FrameworkSourceMeta] = Field(default_factory=dict)


class RuleEvaluationResult(BaseModel):
    """Deterministic evaluation outcome for a single framework control."""

    rule_id: str
    framework: str
    control_id: str
    title: str
    category: str
    severity: SeverityLevel
    status: EvaluationStatus
    actual_value: Any
    expected_value: Any
    evidence: List[str] = Field(default_factory=list)
    source_lines: List[int] = Field(default_factory=list)
    explanation: str
    remediation: str
    source: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 1.0


class FrameworkScore(BaseModel):
    framework: str
    score: float = Field(..., ge=0.0, le=100.0, description="Compliance percentage (0-100)")
    passed_count: int = 0
    failed_count: int = 0
    unknown_count: int = 0
    not_applicable_count: int = 0
    total_applicable: int = 0
    total_evaluated: int = 0


class SeverityStats(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class AuditScoreSummary(BaseModel):
    audit_id: str
    configuration_id: str
    overall_score: float = Field(..., ge=0.0, le=100.0, description="Overall NetVigil Compliance Score")
    framework_scores: Dict[str, FrameworkScore] = Field(default_factory=dict)
    severity_breakdown: SeverityStats = Field(default_factory=SeverityStats)
    status_breakdown: Dict[str, int] = Field(default_factory=dict)
    total_findings: int = 0
    total_applicable: int = 0
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

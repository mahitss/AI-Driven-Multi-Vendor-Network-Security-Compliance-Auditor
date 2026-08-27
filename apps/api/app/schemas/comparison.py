"""
Security Time Machine & Audit Comparison API Schemas
Problem Statement: SIH26155 (NTRO)

Provides structured schemas for before/after deterministic compliance deltas,
AST line-level configuration diffs, and security evolution timelines.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ControlTransitionItem(BaseModel):
    control_id: str = Field(..., description="Governance standard control identifier (e.g. CIS-1.2.1)")
    framework: str = Field(..., description="Benchmark framework (CIS, NIST, STIG, ISO)")
    title: str = Field(..., description="Human-readable title of the rule/control")
    category: Optional[str] = Field(None, description="Security domain/category")
    severity: str = Field(..., description="Severity level: CRITICAL, HIGH, MEDIUM, LOW")
    before_status: str = Field(..., description="Status in baseline audit: PASS, FAIL, UNKNOWN, NOT_EVALUATED")
    after_status: str = Field(..., description="Status in remediated audit: PASS, FAIL, UNKNOWN, NOT_EVALUATED")
    transition_type: str = Field(
        ...,
        description="Transition classification: RESOLVED, REGRESSED, UNCHANGED_FAIL, UNCHANGED_PASS, NEW_FAIL, NEW_PASS",
    )
    before_evidence: Optional[str] = Field(None, description="Line evidence from baseline configuration")
    before_line: Optional[int] = Field(None, description="Line number in baseline configuration")
    after_evidence: Optional[str] = Field(None, description="Line evidence from remediated configuration")
    after_line: Optional[int] = Field(None, description="Line number in remediated configuration")
    remediation_applied: Optional[str] = Field(None, description="Remediation command that resolved this control")
    explanation: str = Field(..., description="Deterministic explanation of why the status changed or persisted")


class PriorityDistribution(BaseModel):
    p0: int = 0
    p1: int = 0
    p2: int = 0
    p3: int = 0


class PostureDeltaSummary(BaseModel):
    before_score: float = Field(..., description="Baseline compliance score (0-100%)")
    after_score: float = Field(..., description="Remediated compliance score (0-100%)")
    score_delta: float = Field(..., description="Compliance score change (+/- %)")
    before_risk_score: float = Field(..., description="Baseline deterministic risk score (0-100)")
    after_risk_score: float = Field(..., description="Remediated deterministic risk score (0-100)")
    risk_delta: float = Field(..., description="Risk score change (+/- points)")
    before_failed_count: int = Field(..., description="Baseline count of failed controls")
    after_failed_count: int = Field(..., description="Remediated count of failed controls")
    failed_delta: int = Field(..., description="Failed controls count reduction/increase")
    resolved_count: int = Field(..., description="Count of controls transitioning from FAIL to PASS")
    regressed_count: int = Field(..., description="Count of controls transitioning from PASS to FAIL")
    unchanged_fail_count: int = Field(..., description="Count of controls persisting in FAIL state")
    unchanged_pass_count: int = Field(..., description="Count of controls persisting in PASS state")
    before_priority_counts: PriorityDistribution = Field(default_factory=PriorityDistribution)
    after_priority_counts: PriorityDistribution = Field(default_factory=PriorityDistribution)
    posture_improvement_percentage: float = Field(
        ..., description="Normalized relative improvement in security posture (0-100%)"
    )


class ConfigurationDiffLine(BaseModel):
    line_number_before: Optional[int] = Field(None, description="1-indexed line number in baseline config")
    line_number_after: Optional[int] = Field(None, description="1-indexed line number in remediated config")
    type: str = Field(..., description="Diff type: UNCHANGED, MODIFIED, ADDED, REMOVED")
    content_before: Optional[str] = Field(None, description="Line text in baseline config")
    content_after: Optional[str] = Field(None, description="Line text in remediated config")
    associated_control_ids: List[str] = Field(
        default_factory=list, description="Controls whose AST fact binds to this line"
    )
    is_security_sensitive: bool = Field(
        default=False, description="True if line contains security-relevant facts"
    )


class SecurityTimelineEvent(BaseModel):
    id: str
    timestamp: datetime
    event_type: str = Field(
        ...,
        description="CONFIG_INGESTED, BASELINE_AUDIT, FINDINGS_IDENTIFIED, REMEDIATION_PROPOSED, CONFIG_HARDENED, REANALYSIS_VERIFIED",
    )
    title: str
    description: str
    audit_id: Optional[str] = None
    configuration_id: Optional[str] = None
    configuration_hash: Optional[str] = None
    status: str = "COMPLETED"
    badge: Optional[str] = None


class AuditComparisonResponse(BaseModel):
    before_audit_id: str
    after_audit_id: str
    configuration_id: str
    device_name: str
    vendor: str
    platform: Optional[str] = None
    evaluated_at: datetime
    is_compatible: bool = True
    compatibility_notes: Optional[str] = None
    deltas: PostureDeltaSummary
    transitions: List[ControlTransitionItem]
    diff_lines: List[ConfigurationDiffLine]
    timeline: List[SecurityTimelineEvent]
    before_config_raw: str
    after_config_raw: str
    resolved_controls_summary: List[str]
    regressed_controls_summary: List[str]
    remaining_open_controls: List[str]


class ComparableAuditPairItem(BaseModel):
    baseline_audit_id: str
    remediated_audit_id: str
    configuration_id: str
    device_name: str
    vendor: str
    baseline_timestamp: datetime
    remediated_timestamp: datetime
    baseline_score: float
    remediated_score: float
    score_delta: float
    resolved_count: int

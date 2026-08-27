"""
NetVigil AI Gateway Task Types and Structured Output Schemas
Problem Statement: SIH26155 (NTRO)

Strict Architectural Rule:
AI is an advisory/interpretation layer only.
AI output schemas must NEVER contain authoritative compliance decision fields.
"""
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class AITaskType(str, Enum):
    """Explicit AI task categories for deterministic model routing."""
    UNKNOWN_SYNTAX_CLASSIFICATION = "UNKNOWN_SYNTAX_CLASSIFICATION"
    CONFIGURATION_EXPLANATION = "CONFIGURATION_EXPLANATION"
    FINDING_EXPLANATION = "FINDING_EXPLANATION"
    RISK_CONTEXT_EXPLANATION = "RISK_CONTEXT_EXPLANATION"
    REMEDIATION_EXPLANATION = "REMEDIATION_EXPLANATION"
    SECURITY_ASSISTANT = "SECURITY_ASSISTANT"
    FRAMEWORK_EXPLANATION = "FRAMEWORK_EXPLANATION"
    DEVICE_SUMMARY = "DEVICE_SUMMARY"
    AUDIT_SUMMARY = "AUDIT_SUMMARY"
    REPORT_SUMMARY = "REPORT_SUMMARY"
    CODE_REVIEW = "CODE_REVIEW"
    CLI_SYNTAX_ASSISTANCE = "CLI_SYNTAX_ASSISTANCE"
    SECURITY_BRIEFING = "SECURITY_BRIEFING"
    ANALYST_COPILOT = "ANALYST_COPILOT"


# Forbidden keys that AI responses are strictly disallowed from overriding
FORBIDDEN_COMPLIANCE_FIELDS = {
    "compliance_status",
    "pass_fail",
    "status",
    "risk_score",
    "severity_override",
    "overall_score",
}


class BaseAdvisoryResponse(BaseModel):
    """Base schema enforcing advisory-only nature of AI responses."""
    advisory_only: bool = Field(default=True, description="Strict marker that this output is non-authoritative advisory intelligence.")
    limitations: Optional[str] = Field(default=None, description="Known boundary or missing context in the evidence.")

    @field_validator("*", mode="before")
    @classmethod
    def discard_forbidden_verdicts(cls, v: Any, info) -> Any:
        if info.field_name in FORBIDDEN_COMPLIANCE_FIELDS:
            return None
        return v


class UnknownSyntaxResponse(BaseAdvisoryResponse):
    """Structured response for vendor CLI syntax classification."""
    candidate_property: Optional[str] = Field(description="Normalized allowlisted property name (e.g. remote_access.ssh_version)")
    candidate_value: Optional[Any] = Field(default=None, description="Inferred property value (bool, int, or string)")
    explanation: str = Field(description="Human-readable explanation of what the command does")
    confidence: float = Field(default=0.7, ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    evidence: Optional[str] = Field(default=None, description="Observed syntax tokens or context")


class FindingExplanationResponse(BaseAdvisoryResponse):
    """Structured explanation for a deterministic compliance finding."""
    summary: str = Field(description="High-level technical overview of the finding")
    why_it_matters: str = Field(description="Real-world attack vector and exploit mechanism")
    evidence_interpretation: str = Field(description="Explanation of verbatim configuration evidence lines")
    remediation_context: str = Field(description="Guidance on corrective commands and operational impact")


class SecurityAssistantResponse(BaseAdvisoryResponse):
    """Structured response for Q&A assistant queries."""
    answer: str = Field(description="Natural language response grounded strictly in audit evidence")
    evidence_used: List[str] = Field(default_factory=list, description="Specific finding control IDs or configuration lines cited")
    suggested_followups: List[str] = Field(default_factory=list, description="Relevant related security questions")


class RiskContextResponse(BaseAdvisoryResponse):
    """Structured risk prioritization and topological exposure explanation."""
    threat_scenario: str = Field(description="Potential adversary exploitation chain")
    blast_radius_explanation: str = Field(description="Context on lateral movement and asset exposure")
    mitigation_urgency: str = Field(description="Why this priority (P0-P3) was assigned deterministically")


class RemediationExplanationResponse(BaseAdvisoryResponse):
    """Explanation of allowlisted remediation commands and potential side effects."""
    command_breakdown: List[Dict[str, str]] = Field(default_factory=list, description="Step-by-step explanation of remediation CLI lines")
    prerequisites: List[str] = Field(default_factory=list, description="Pre-requisite configuration commands (e.g., crypto key generation)")
    rollback_guidance: Optional[str] = Field(default=None, description="Reversion instructions if changes cause operational impact")


class DeviceSummaryResponse(BaseAdvisoryResponse):
    """Advisory summary of an audited network asset."""
    profile_summary: str = Field(description="Summary of device role, vendor OS, and evaluated posture")
    critical_weaknesses: List[str] = Field(default_factory=list, description="Key vulnerability themes identified")


class AuditSummaryResponse(BaseAdvisoryResponse):
    """Executive narrative summary of an entire compliance audit session."""
    executive_narrative: str = Field(description="High-level summary for security leadership")
    framework_strengths: List[str] = Field(default_factory=list, description="Frameworks where baseline is well-maintained")
    top_deficiencies: List[str] = Field(default_factory=list, description="Primary control areas requiring remediation")


class ReportSummaryResponse(BaseAdvisoryResponse):
    """Formal audit report preface and strategic security recommendations."""
    document_preface: str = Field(description="Formal executive statement for compliance reporting")
    strategic_recommendations: List[str] = Field(default_factory=list, description="Long-term hardening recommendations")


class ConfigurationExplanationResponse(BaseAdvisoryResponse):
    """Detailed structural walkthrough of an ingested network device configuration."""
    overview: str = Field(description="Architecture and deployment mode of the configuration")
    security_domains_configured: List[str] = Field(default_factory=list, description="Security areas present (AAA, ACLs, logging, etc.)")
    observations: List[str] = Field(default_factory=list, description="Notable configuration traits or legacy patterns observed")


class FrameworkExplanationResponse(BaseAdvisoryResponse):
    """Grounded explanation of compliance frameworks (CIS, NIST, STIG, ISO) and control requirements."""
    framework_overview: str = Field(description="Scope and purpose of the standard")
    control_objective: str = Field(description="Security objective of the referenced baseline control")
    implementation_guidance: str = Field(description="Standard technical hardening requirements")


class CodeReviewResponse(BaseAdvisoryResponse):
    """Structured review of parser code or regex rule definitions."""
    assessment: str = Field(description="Quality and safety assessment of syntax grammar")
    edge_cases_identified: List[str] = Field(default_factory=list, description="Potential unhandled vendor syntax permutations")


class CLISyntaxAssistanceResponse(BaseAdvisoryResponse):
    """Assistance with multi-vendor command equivalence."""
    vendor_equivalents: Dict[str, str] = Field(default_factory=dict, description="Equivalent commands across Cisco, Juniper, Fortinet")
    caveats: Optional[str] = Field(default=None, description="Dialect differences and operational caveats")

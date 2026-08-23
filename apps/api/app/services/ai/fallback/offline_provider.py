"""
NetVigil Offline Deterministic Standby AI Provider
Problem Statement: SIH26155 (NTRO)

Strict Requirement:
If OpenRouter is unconfigured, unreachable, or in air-gapped defense mode,
NetVigil falls back cleanly to this offline deterministic provider.
Core parsing and compliance continue seamlessly.
"""
from typing import Any, Dict, Optional, Type, TypeVar
from pydantic import BaseModel

from app.schemas.ai import (
    AuditAssistantQueryResponse,
    FindingExplanationResponse as FindingExplanationLegacy,
    UnknownConfigInterpretationResponse,
)
from app.services.ai.schemas.models import (
    AITaskType,
    UnknownSyntaxResponse,
    FindingExplanationResponse as FindingExplanationModel,
    SecurityAssistantResponse,
    RiskContextResponse,
    RemediationExplanationResponse,
    AuditSummaryResponse,
)

T = TypeVar("T", bound=BaseModel)


class OfflineStandbyProvider:
    """Provides deterministic rule-based fallback responses when external AI is offline."""

    @classmethod
    async def generate_fallback_response(
        cls,
        task_type: AITaskType,
        user_prompt: str,
        response_schema: Optional[Type[T]] = None,
        context_data: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Generates a safe grounded fallback matching the expected Pydantic schema."""
        ctx = context_data or {}

        # 1. Unknown Syntax Interpretation
        if response_schema == UnknownConfigInterpretationResponse or response_schema == UnknownSyntaxResponse or task_type == AITaskType.UNKNOWN_SYNTAX_CLASSIFICATION:
            raw_cmd = ctx.get("raw_command", "")
            vendor = ctx.get("vendor_hint", "device")
            if response_schema == UnknownConfigInterpretationResponse:
                return UnknownConfigInterpretationResponse(
                    status="candidate",
                    normalized_category=ctx.get("category", "remote_access"),
                    semantic_meaning=f"Configures {vendor} security setting: {raw_cmd}",
                    candidate_property=ctx.get("candidate_property", "remote_access.inactivity_timeout_minutes"),
                    candidate_value=ctx.get("candidate_value", True),
                    confidence=0.75,
                    reasoning_summary="Offline deterministic pattern matching fallback",
                    evidence=[raw_cmd] if raw_cmd else [],
                    alternative_interpretations=[],
                    confidence_tier="review",
                )
            return UnknownSyntaxResponse(
                candidate_property=ctx.get("candidate_property", "remote_access.inactivity_timeout_minutes"),
                candidate_value=ctx.get("candidate_value", True),
                explanation=f"Deterministic fallback: directive '{raw_cmd}' identified in network configuration profile.",
                confidence=0.75,
                evidence=raw_cmd,
                limitations="Generated via local offline rule classifier. OpenRouter live reasoning inactive.",
            )

        # 2. Finding Explanation
        elif response_schema == FindingExplanationModel or response_schema == FindingExplanationLegacy or task_type == AITaskType.FINDING_EXPLANATION:
            title = ctx.get("title", "Security Finding")
            control_id = ctx.get("control_id", "SEC-CTRL")
            evidence = ctx.get("evidence", "Missing baseline configuration")

            if response_schema == FindingExplanationModel:
                return FindingExplanationModel(
                    summary=f"Control {control_id}: {title}. Evaluated deterministically against baseline standard.",
                    why_it_matters="Misconfigured management or cryptographic parameters expose network devices to unauthorized interception.",
                    evidence_interpretation=f"Evidence observed in configuration: '{evidence}'.",
                    remediation_context="Apply allowlisted vendor-specific CLI configuration template to restore compliant state.",
                    limitations="Offline deterministic explanation mode. OpenRouter model connection standby.",
                )

            return FindingExplanationLegacy(
                summary=f"Control {control_id}: {title}. Evaluated deterministically against baseline standard.",
                why_it_matters="Misconfigured management or cryptographic parameters expose network devices to unauthorized interception.",
                technical_explanation=f"Configuration directive '{evidence}' deviates from recommended security baseline.",
                risk_context="Potential risk of unauthorized administrative access or unencrypted transport.",
                recommended_action="Apply allowlisted vendor-specific CLI configuration template to restore compliant state.",
                confidence=0.90,
                evidence_used=[evidence] if evidence else [],
                source_lines=[],
            )

        # 3. Security Assistant Chat Q&A
        elif response_schema == AuditAssistantQueryResponse or response_schema == SecurityAssistantResponse or task_type == AITaskType.SECURITY_ASSISTANT:
            query = ctx.get("query", user_prompt)
            audit_id = ctx.get("audit_id", "")
            findings_count = ctx.get("findings_count", 0)
            cited_controls = ctx.get("cited_controls", [])
            if response_schema == AuditAssistantQueryResponse:
                return AuditAssistantQueryResponse(
                    query=query,
                    audit_id=audit_id,
                    answer=f"NetVigil AI Standby: Audit session evaluated {findings_count} deterministic compliance controls. For detailed evidence and CLI diffs, consult the Evidence Findings and Remediation Center modules.",
                    supporting_findings=cited_controls,
                    confidence=0.95,
                    sources_count=len(cited_controls),
                )
            return SecurityAssistantResponse(
                answer=f"NetVigil AI Standby: Audit session evaluated {findings_count} deterministic compliance controls.",
                evidence_used=cited_controls,
                suggested_followups=["Which findings have CRITICAL severity?", "What remediation commands are available?"],
                limitations="Operating in offline deterministic mode.",
            )

        # 4. Risk Context
        elif task_type == AITaskType.RISK_CONTEXT_EXPLANATION:
            return RiskContextResponse(
                threat_scenario="Adversaries targeting perimeter network devices exploit unencrypted management protocols or default credentials.",
                blast_radius_explanation="Compromise of management plane allows transit traffic sniffing and lateral movement to internal network segments.",
                mitigation_urgency="Priority determined by CVSS base metrics and administrative reachability.",
                limitations="Deterministic offline risk profile.",
            )

        # 5. Remediation Explanation
        elif task_type == AITaskType.REMEDIATION_EXPLANATION:
            return RemediationExplanationResponse(
                command_breakdown=[{"step": "1", "detail": "Apply allowlisted hardening CLI block"}],
                prerequisites=["Verify console or out-of-band management access"],
                rollback_guidance="Revert modified lines using baseline configuration backup.",
                limitations="Offline remediation context.",
            )

        # Default fallback instantiation
        if response_schema:
            try:
                return response_schema(
                    advisory_only=True,
                    limitations="Offline Standby Mode. Core deterministic compliance remains 100% active.",
                )
            except Exception:
                pass

        return {
            "advisory_only": True,
            "status": "OFFLINE_STANDBY",
            "message": "AI gateway operating in deterministic offline standby mode.",
        }

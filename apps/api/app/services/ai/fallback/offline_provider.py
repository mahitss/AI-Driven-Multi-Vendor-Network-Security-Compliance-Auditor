"""
NetVigil Offline Deterministic Standby AI Provider
Problem Statement: SIH26155 (NTRO)

Strict Requirement:
If OpenRouter is unconfigured, unreachable, or in air-gapped defense mode,
NetVigil falls back cleanly to this offline deterministic provider.
Core parsing and compliance continue seamlessly.
"""
import logging
from typing import Any, Dict, Optional, Type, TypeVar
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

from app.schemas.ai import (
    AuditAssistantQueryResponse,
    FindingExplanationResponse as FindingExplanationLegacy,
    RiskExplanationResponse as RiskExplanationLegacy,
    RemediationExplanationResponse as RemediationExplanationLegacy,
    UnknownConfigInterpretationResponse,
    AISecurityBriefingResponse,
    CopilotChatResponse,
    TopRiskBriefItem,
    EvidenceCitation,
    InvestigationOrderStep,
    SecurityEvolutionBrief,
)
from app.services.ai.schemas.models import (
    AITaskType,
    UnknownSyntaxResponse,
    FindingExplanationResponse as FindingExplanationModel,
    SecurityAssistantResponse,
    RiskContextResponse,
    RemediationExplanationResponse as RemediationExplanationModel,
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
        if (
            response_schema == UnknownConfigInterpretationResponse
            or response_schema == UnknownSyntaxResponse
            or task_type == AITaskType.UNKNOWN_SYNTAX_CLASSIFICATION
        ):
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
        elif (
            response_schema == FindingExplanationModel
            or response_schema == FindingExplanationLegacy
            or task_type == AITaskType.FINDING_EXPLANATION
        ):
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

        # 3. Risk Context / Risk Explanation
        elif (
            response_schema == RiskExplanationLegacy
            or response_schema == RiskContextResponse
            or task_type == AITaskType.RISK_CONTEXT_EXPLANATION
        ):
            risk_id = ctx.get("risk_id", "RISK-01")
            title = ctx.get("title", "Security Risk Exposure")
            risk_score = ctx.get("risk_score", 75.0)
            priority = ctx.get("priority", "P1")
            contributing = ctx.get("contributing_findings", [])

            if response_schema == RiskExplanationLegacy:
                return RiskExplanationLegacy(
                    risk_id=risk_id,
                    title=title,
                    deterministic_risk_score=float(risk_score),
                    priority=priority,
                    why_this_risk_is_prioritized=f"Risk is prioritized at {priority} based on direct perimeter reachability and composite severity score of {risk_score}.",
                    contributing_findings_analysis=contributing if contributing else ["Direct configuration vulnerability"],
                    attack_surface_analysis="Administrative interfaces and services exposed without strong cryptographic or access controls.",
                    business_operational_impact="Potential unauthorized privilege escalation or eavesdropping on transit management traffic.",
                    why_remediation_matters="Applying the remediation diff restores strict control plane isolation and mitigates attack surface exposure.",
                    confidence=0.95,
                )

            return RiskContextResponse(
                threat_scenario="Adversaries targeting perimeter network devices exploit unencrypted management protocols or default credentials.",
                blast_radius_explanation="Compromise of management plane allows transit traffic sniffing and lateral movement to internal network segments.",
                mitigation_urgency="Priority determined by CVSS base metrics and administrative reachability.",
                limitations="Deterministic offline risk profile.",
            )

        # 4. Remediation Explanation
        elif (
            response_schema == RemediationExplanationLegacy
            or response_schema == RemediationExplanationModel
            or task_type == AITaskType.REMEDIATION_EXPLANATION
        ):
            rem_id = ctx.get("remediation_id", "REM-01")
            control_id = ctx.get("control_id", "CONTROL")
            vendor = ctx.get("vendor", "cisco").upper()

            if response_schema == RemediationExplanationLegacy:
                return RemediationExplanationLegacy(
                    remediation_id=rem_id,
                    control_id=control_id,
                    vendor=vendor,
                    what_changes=f"Replaces insecure directives with hardened {vendor} configuration syntax.",
                    why_change_is_safe="Targeted CLI commands apply only to the affected management line or service without impacting active routing table forwarding.",
                    what_security_property_is_restored="Restores deterministic compliance baseline invariant (cryptographic encryption and access restriction).",
                    what_operator_should_verify=f"Execute '{vendor.lower()} show running-config' and test administrative login before committing changes.",
                    confidence=0.95,
                )

            return RemediationExplanationModel(
                command_breakdown=[{"step": "1", "detail": "Apply allowlisted hardening CLI block"}],
                prerequisites=["Verify console or out-of-band management access"],
                rollback_guidance="Revert modified lines using baseline configuration backup.",
                limitations="Offline remediation context.",
            )

        # 5. Security Assistant Chat Q&A
        elif (
            response_schema == AuditAssistantQueryResponse
            or response_schema == SecurityAssistantResponse
            or task_type == AITaskType.SECURITY_ASSISTANT
        ):
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

        # 6. AI Security Briefing
        elif response_schema == AISecurityBriefingResponse or task_type == AITaskType.SECURITY_BRIEFING:
            audit_id = ctx.get("audit_id", "")
            baseline_id = ctx.get("baseline_audit_id")
            hostname = ctx.get("device_hostname", "Gateway-Node")
            vendor = ctx.get("vendor", "cisco")
            score = ctx.get("compliance_score", 0.0)
            risk = ctx.get("risk_score", 0.0)
            p0 = ctx.get("priority_counts", {}).get("P0", 0)
            p1 = ctx.get("priority_counts", {}).get("P1", 0)
            findings = ctx.get("findings", [])
            evolution = ctx.get("evolution_deltas")

            top_risks_items = []
            for f in findings[:5]:
                cid = f.get("control_id", "CIS-1.1")
                top_risks_items.append(
                    TopRiskBriefItem(
                        control_id=cid,
                        title=f.get("title", "Security Control Violation"),
                        severity=f.get("severity", "HIGH"),
                        priority="P0" if f.get("severity") == "CRITICAL" else "P1",
                        why_it_matters=f"Violation of {cid} creates potential unauthorized administrative access or unencrypted communication attack surface on {hostname}.",
                        evidence_citation=EvidenceCitation(
                            control_id=cid,
                            framework=f.get("framework", "CIS"),
                            line_number=f.get("source_line"),
                            evidence_snippet=f.get("evidence"),
                            status=f.get("status", "FAIL"),
                            severity=f.get("severity", "HIGH"),
                            title=f.get("title"),
                            citation_label=f"EVIDENCE · LINE {f.get('source_line')}" if f.get('source_line') else "EVIDENCE",
                        ),
                        recommended_action=f"Remediate via deterministic static catalog template for {cid}.",
                        actual_value=f.get("actual_value"),
                        expected_value=f.get("expected_value"),
                    )
                )

            investigation_steps = []
            for idx, f in enumerate(findings[:4], 1):
                cid = f.get("control_id", "CIS-1.1")
                line_no = f.get("source_line")
                investigation_steps.append(
                    InvestigationOrderStep(
                        step_number=idx,
                        control_id=cid,
                        priority="P0" if f.get("severity") == "CRITICAL" else "P1",
                        action_summary=f"Inspect line {line_no or '[config]'} and apply allowlisted hardening directive for {cid}.",
                        target_lines=[line_no] if line_no else [],
                        reason=f"High risk exposure on management boundary ({f.get('title')}).",
                    )
                )

            evo_brief = None
            if evolution:
                d = evolution.get("deltas", {})
                evo_brief = SecurityEvolutionBrief(
                    baseline_audit_id=evolution.get("before_audit_id", ""),
                    current_audit_id=evolution.get("after_audit_id", ""),
                    before_score=d.get("before_score", 0.0),
                    after_score=d.get("after_score", 0.0),
                    score_delta=d.get("score_delta", 0.0),
                    risk_delta=d.get("risk_delta", 0.0),
                    resolved_count=d.get("resolved_count", 0),
                    regressed_count=d.get("regressed_count", 0),
                    resolved_controls_summary=[t["control_id"] for t in evolution.get("transitions", []) if t.get("transition_type") == "RESOLVED"][:5],
                    regressed_controls_summary=[t["control_id"] for t in evolution.get("transitions", []) if t.get("transition_type") == "REGRESSED"][:5],
                    narrative=f"Posture evolution evaluated: Compliance improved by +{d.get('score_delta', 0)}% with {d.get('resolved_count', 0)} resolved controls.",
                )

            citations = [r.evidence_citation for r in top_risks_items if r.evidence_citation]

            return AISecurityBriefingResponse(
                advisory_only=True,
                audit_id=audit_id,
                baseline_audit_id=baseline_id,
                device_hostname=hostname,
                detected_vendor=vendor,
                compliance_score=score,
                risk_score=risk,
                critical_p0_count=p0,
                high_p1_count=p1,
                posture_trend="CRITICAL_ATTENTION_REQUIRED" if (p0 > 0 or risk > 70) else "MODERATE_RISK",
                executive_summary=f"Deterministic evaluation for {hostname} ({vendor.upper()}) scored {score:.1f}% compliance with an algorithmic risk score of {risk:.1f}/100. Identified {len(findings)} open findings, including {p0} Critical (P0) exposures requiring prompt administrative remediation.",
                top_risks=top_risks_items,
                security_evolution=evo_brief,
                recommended_investigation_order=investigation_steps,
                suggested_copilot_questions=[
                    "Why is this audit high risk?",
                    "Show me the most critical finding.",
                    "Why did CIS-1.2.1 fail?",
                    "What changed after remediation?",
                    "Which controls remain unresolved?",
                ],
                grounded_evidence_citations=citations,
                model_used="offline-standby-rules",
                provider="offline_standby",
                limitations="Operating in offline deterministic standby mode. Core AST compliance scores and risk metrics remain strictly authoritative.",
            )

        # 7. Analyst Copilot Q&A
        elif response_schema == CopilotChatResponse or task_type == AITaskType.ANALYST_COPILOT:
            query = ctx.get("query", user_prompt)
            audit_id = ctx.get("audit_id", "")
            findings = ctx.get("findings", [])
            citations = []
            for f in findings[:3]:
                cid = f.get("control_id", "CIS-1.1")
                citations.append(
                    EvidenceCitation(
                        control_id=cid,
                        framework=f.get("framework", "CIS"),
                        line_number=f.get("source_line"),
                        evidence_snippet=f.get("evidence"),
                        status=f.get("status", "FAIL"),
                        severity=f.get("severity", "HIGH"),
                        title=f.get("title"),
                        citation_label=f"EVIDENCE · LINE {f.get('source_line')}" if f.get('source_line') else "EVIDENCE",
                    )
                )

            return CopilotChatResponse(
                advisory_only=True,
                query=query,
                audit_id=audit_id,
                answer=f"NetVigil Copilot (Standby): Based on deterministic audit findings for {audit_id}, {len(findings)} controls were evaluated. Key non-compliant controls include {', '.join(c.control_id for c in citations)}. Verify AST evidence lines in the Evidence Explorer before applying allowlisted fixes.",
                grounded_evidence=citations,
                suggested_followups=[
                    "What is the recommended fix for the highest priority finding?",
                    "What is the total blast radius if exploited?",
                    "How does this configuration compare to hardened standards?",
                ],
                model_used="offline-standby-rules",
                disclaimer="AI-assisted response grounded strictly in verified AST audit findings. Zero device write capability.",
            )

        # Default fallback instantiation
        if response_schema:
            try:
                return response_schema(
                    advisory_only=True,
                    limitations="Offline Standby Mode. Core deterministic compliance remains 100% active.",
                )
            except (ValidationError, TypeError) as err:
                logger.debug("Schema fallback instantiation bypassed in offline provider: %s", err)
            except Exception as err:
                logger.warning("Unexpected error instantiating response schema in offline provider: %s", err)

        return {
            "advisory_only": True,
            "status": "OFFLINE_STANDBY",
            "message": "AI gateway operating in deterministic offline standby mode.",
        }

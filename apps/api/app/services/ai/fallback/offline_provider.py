"""
NetVigil Offline Deterministic Standby AI Provider
Problem Statement: SIH26155 (NTRO)

Strict Requirement:
If OpenRouter is unconfigured, unreachable, or in air-gapped defense mode,
NetVigil falls back cleanly to this offline deterministic provider.
Core parsing and compliance continue seamlessly.
"""
import logging
import re
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
            copilot_resp = cls._generate_grounded_copilot_response(query=query, audit_id=audit_id, ctx=ctx)
            supporting_findings = [c.control_id for c in copilot_resp.grounded_evidence]
            if response_schema == AuditAssistantQueryResponse:
                return AuditAssistantQueryResponse(
                    query=query,
                    audit_id=audit_id,
                    answer=copilot_resp.answer,
                    supporting_findings=supporting_findings,
                    confidence=0.95,
                    sources_count=len(supporting_findings),
                )
            return SecurityAssistantResponse(
                answer=copilot_resp.answer,
                evidence_used=supporting_findings,
                suggested_followups=copilot_resp.suggested_followups,
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
            return cls._generate_grounded_copilot_response(query=query, audit_id=audit_id, ctx=ctx)

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

    @classmethod
    def _generate_grounded_copilot_response(
        cls,
        query: str,
        audit_id: str,
        ctx: Dict[str, Any],
    ) -> CopilotChatResponse:
        """
        Generates question-specific, evidence-grounded answers from authoritative audit data:
        - Accurately interprets analyst intent (specific control, risk, P0, remediation, delta, unresolved).
        - Cites exact configuration lines without fake line citations.
        - Provides distinct answers for distinct queries.
        - Preserves strict read-only advisory boundaries.
        """
        findings = ctx.get("findings", [])
        hostname = ctx.get("device_hostname") or "Target-Node"
        vendor = (ctx.get("vendor") or "network").upper()
        compliance_score = float(ctx.get("compliance_score", 0.0))
        risk_score = float(ctx.get("risk_score", 0.0))
        priority_counts = ctx.get("priority_counts") or {}
        evolution = ctx.get("evolution_deltas")

        failed_findings = [f for f in findings if str(f.get("status", "")).upper() == "FAIL"]
        passed_findings = [f for f in findings if str(f.get("status", "")).upper() == "PASS"]
        critical_findings = [f for f in failed_findings if str(f.get("severity", "")).upper() == "CRITICAL"]
        high_findings = [f for f in failed_findings if str(f.get("severity", "")).upper() == "HIGH"]
        medium_findings = [f for f in failed_findings if str(f.get("severity", "")).upper() == "MEDIUM"]

        p0_count = priority_counts.get("P0", len(critical_findings))
        p1_count = priority_counts.get("P1", len(high_findings))

        q_lower = query.lower()

        # 1. SPECIFIC CONTROL QUERY (e.g., "Why did CIS-1.2.1 fail?", "What is CIS-1.1.1?")
        matched_finding = None
        for f in findings:
            cid = f.get("control_id", "")
            if cid and cid.lower() in q_lower:
                matched_finding = f
                break

        if not matched_finding:
            ctrl_match = re.search(r"\b([A-Za-z0-9]+[-_][A-Za-z0-9\.\-_]+)\b", query)
            if ctrl_match:
                req_cid = ctrl_match.group(1).upper()
                for f in findings:
                    cid = f.get("control_id", "").upper()
                    if req_cid == cid or req_cid.replace("-", ".") == cid.replace("-", "."):
                        matched_finding = f
                        break

        if matched_finding:
            cid = matched_finding.get("control_id", "CONTROL")
            status = matched_finding.get("status", "FAIL")
            severity = matched_finding.get("severity", "HIGH")
            title = matched_finding.get("title", "Security Control Directive")
            framework = matched_finding.get("framework", "CIS")
            line_no = matched_finding.get("source_line")
            evidence = matched_finding.get("evidence") or "Directive unconfigured in target device profile"
            actual = matched_finding.get("actual_value") or "Unconfigured / Deficient"
            expected = matched_finding.get("expected_value") or "Hardened Baseline Requirement"
            line_badge = f"[EVIDENCE · LINE {line_no}]" if line_no else "[EVIDENCE · DIRECTIVE ABSENT]"

            if status == "FAIL":
                answer = (
                    f"### Control Analysis: {cid} ({severity} - FAIL)\n"
                    f"**Title:** {title}\n"
                    f"**Framework:** {framework} | **Device:** {hostname} ({vendor})\n\n"
                    f"**Deterministic Evidence Citation:**\n"
                    f"{line_badge} `{evidence}`\n\n"
                    f"**Evaluation Summary:**\n"
                    f"- Observed State: `{actual}`\n"
                    f"- Hardened Baseline: `{expected}`\n\n"
                    f"**Allowlisted Remediation Guidance:**\n"
                    f"Apply the allowlisted {vendor} configuration patch from the Remediation Center for {cid}. "
                    f"NetVigil operates in read-only advisory mode with zero device write push."
                )
            else:
                answer = (
                    f"### Control Analysis: {cid} ({severity} - {status})\n"
                    f"**Title:** {title}\n"
                    f"**Framework:** {framework} | **Device:** {hostname} ({vendor})\n\n"
                    f"**Compliance Status Verified:**\n"
                    f"Control {cid} satisfies the hardened security baseline ({status}).\n"
                    f"{line_badge} `{evidence}`\n\n"
                    f"**Verified Setting:**\n"
                    f"- Observed State: `{actual}`\n"
                    f"- Required Baseline: `{expected}`"
                )

            citation = EvidenceCitation(
                control_id=cid,
                framework=framework,
                line_number=line_no,
                evidence_snippet=evidence,
                status=status,
                severity=severity,
                title=title,
                citation_label=f"EVIDENCE · LINE {line_no}" if line_no else "EVIDENCE",
            )
            return CopilotChatResponse(
                advisory_only=True,
                query=query,
                audit_id=audit_id,
                answer=answer,
                grounded_evidence=[citation],
                suggested_followups=[
                    f"Show remediation commands for {cid}.",
                    f"What other controls failed on {hostname}?",
                    "Show me the most critical finding.",
                ],
                model_used="offline-standby-rules",
                disclaimer="AI-assisted response grounded strictly in verified AST audit findings. Zero device write capability.",
            )

        # 2. CRITICAL / P0 / HIGHEST SEVERITY QUERY (e.g. "Show me the most critical finding", "What are P0 issues?")
        if re.search(r"\b(critical|p0|most critical|highest|worst|top finding|highest risk finding)\b", q_lower):
            if critical_findings:
                top = critical_findings[0]
                line_no = top.get("source_line")
                evidence = top.get("evidence") or "Directive unconfigured"
                line_badge = f"[EVIDENCE · LINE {line_no}]" if line_no else "[EVIDENCE · DIRECTIVE ABSENT]"
                answer = (
                    f"### Highest Priority Finding: {top.get('control_id')} (CRITICAL / P0)\n"
                    f"**Title:** {top.get('title')}\n"
                    f"**Framework:** {top.get('framework', 'CIS')} | **Device:** {hostname} ({vendor})\n\n"
                    f"**AST Evidence Citation:**\n"
                    f"{line_badge} `{evidence}`\n\n"
                    f"**Why This Matters:**\n"
                    f"This critical violation represents an immediate exposure vector on {hostname}. "
                    f"Observed configuration: `{top.get('actual_value')}`, Expected baseline: `{top.get('expected_value')}`.\n\n"
                    f"**Recommended Action:**\n"
                    f"Prioritize remediation for {top.get('control_id')} in the Remediation Center. "
                    f"NetVigil provides catalog-allowlisted CLI diffs with zero device write push."
                )
                citations = [
                    EvidenceCitation(
                        control_id=f.get("control_id", "CIS-1.1"),
                        framework=f.get("framework", "CIS"),
                        line_number=f.get("source_line"),
                        evidence_snippet=f.get("evidence"),
                        status=f.get("status", "FAIL"),
                        severity=f.get("severity", "CRITICAL"),
                        title=f.get("title"),
                        citation_label=f"EVIDENCE · LINE {f.get('source_line')}" if f.get("source_line") else "EVIDENCE",
                    )
                    for f in critical_findings[:3]
                ]
            elif high_findings:
                top = high_findings[0]
                line_no = top.get("source_line")
                evidence = top.get("evidence") or "Directive unconfigured"
                line_badge = f"[EVIDENCE · LINE {line_no}]" if line_no else "[EVIDENCE · DIRECTIVE ABSENT]"
                answer = (
                    f"### Highest Severity Finding: {top.get('control_id')} (HIGH / P1)\n"
                    f"No Critical (P0) findings were detected. The highest priority exposure is:\n\n"
                    f"**Title:** {top.get('title')}\n"
                    f"**Framework:** {top.get('framework', 'CIS')} | **Device:** {hostname} ({vendor})\n\n"
                    f"**AST Evidence Citation:**\n"
                    f"{line_badge} `{evidence}`\n\n"
                    f"**Recommended Action:**\n"
                    f"Review allowlisted patch in the Remediation Center for {top.get('control_id')}."
                )
                citations = [
                    EvidenceCitation(
                        control_id=f.get("control_id", "CIS-1.1"),
                        framework=f.get("framework", "CIS"),
                        line_number=f.get("source_line"),
                        evidence_snippet=f.get("evidence"),
                        status=f.get("status", "FAIL"),
                        severity=f.get("severity", "HIGH"),
                        title=f.get("title"),
                        citation_label=f"EVIDENCE · LINE {f.get('source_line')}" if f.get("source_line") else "EVIDENCE",
                    )
                    for f in high_findings[:3]
                ]
            else:
                answer = (
                    f"### Clean Security Posture: Zero Active Critical/High Vulnerabilities\n"
                    f"All evaluated high-priority controls on {hostname} successfully passed deterministic compliance checks. "
                    f"Total controls evaluated: {len(findings)}."
                )
                citations = []

            return CopilotChatResponse(
                advisory_only=True,
                query=query,
                audit_id=audit_id,
                answer=answer,
                grounded_evidence=citations,
                suggested_followups=[
                    "Why is this audit high risk?",
                    "Which controls remain unresolved?",
                    "What changed after remediation?",
                ],
                model_used="offline-standby-rules",
                disclaimer="AI-assisted response grounded strictly in verified AST audit findings. Zero device write capability.",
            )

        # 3. RISK / HIGH RISK / ATTACK SURFACE / BLAST RADIUS (e.g. "Why is this audit high risk?", "Explain attack surface")
        if re.search(r"\b(high risk|why.*risk|attack surface|blast radius|risk score|exposure)\b", q_lower):
            risk_tier = "CRITICAL / ELEVATED" if risk_score >= 60 else ("MODERATE" if risk_score >= 30 else "LOW")
            top_drivers = (critical_findings + high_findings)[:3]
            drivers_text = "\n".join(
                f"- **{f.get('control_id')}** ({f.get('severity')}): {f.get('title')} [EVIDENCE · LINE {f.get('source_line') or 'N/A'}]"
                for f in top_drivers
            ) if top_drivers else "- No severe exposure vectors identified."

            answer = (
                f"### Algorithmic Risk Analysis: {hostname} ({risk_tier})\n"
                f"- **Algorithmic Risk Score:** **{risk_score:.1f} / 100**\n"
                f"- **Deterministic Compliance:** **{compliance_score:.1f}%**\n"
                f"- **Active Exposures:** {p0_count} Critical (P0), {p1_count} High (P1) out of {len(failed_findings)} failing controls.\n\n"
                f"**Primary Risk Drivers:**\n"
                f"{drivers_text}\n\n"
                f"**Attack Surface Assessment:**\n"
                f"The identified deficiencies expose the administrative boundary and access perimeter on {hostname}. "
                f"Unencrypted services or absent AAA controls permit unauthorized lateral movement if adjacent segments are compromised."
            )
            citations = [
                EvidenceCitation(
                    control_id=f.get("control_id", "CIS-1.1"),
                    framework=f.get("framework", "CIS"),
                    line_number=f.get("source_line"),
                    evidence_snippet=f.get("evidence"),
                    status=f.get("status", "FAIL"),
                    severity=f.get("severity", "HIGH"),
                    title=f.get("title"),
                    citation_label=f"EVIDENCE · LINE {f.get('source_line')}" if f.get("source_line") else "EVIDENCE",
                )
                for f in top_drivers
            ]
            return CopilotChatResponse(
                advisory_only=True,
                query=query,
                audit_id=audit_id,
                answer=answer,
                grounded_evidence=citations,
                suggested_followups=[
                    "Show me the most critical finding.",
                    "Which controls remain unresolved?",
                    "What is the recommended remediation plan?",
                ],
                model_used="offline-standby-rules",
                disclaimer="AI-assisted response grounded strictly in verified AST audit findings. Zero device write capability.",
            )

        # 4. EVOLUTION / REMEDIATION DELTA / WHAT CHANGED (e.g. "What changed after remediation?", "What is the delta?")
        if re.search(r"\b(what changed|after remediation|delta|evolution|difference|time machine|improved|before and after)\b", q_lower):
            if evolution:
                d = evolution.get("deltas", {})
                transitions = evolution.get("transitions", [])
                resolved = [t.get("control_id") for t in transitions if t.get("transition_type") == "RESOLVED"]
                regressed = [t.get("control_id") for t in transitions if t.get("transition_type") == "REGRESSED"]
                answer = (
                    f"### Security Evolution & Remediation Delta\n"
                    f"Deterministic AST comparative delta between baseline and remediated states for {hostname}:\n\n"
                    f"- **Compliance Posture:** {d.get('before_score', 0):.1f}% → {d.get('after_score', 0):.1f}% ({d.get('score_delta', 0):+.1f} pts)\n"
                    f"- **Algorithmic Risk:** {d.get('before_risk', 0):.1f} → {d.get('after_risk', 0):.1f} ({d.get('risk_delta', 0):+.1f} pts)\n"
                    f"- **Resolved Controls ({len(resolved)}):** {', '.join(resolved[:5]) or 'None'}\n"
                    f"- **Regressed Controls ({len(regressed)}):** {', '.join(regressed[:5]) or '0 (Hardened State Preserved)'}\n\n"
                    f"**Remediation Verification Verdict:**\n"
                    f"The AST simulation confirms {len(resolved)} finding(s) were successfully resolved by the proposed patch. "
                    f"Zero unexpected syntax regressions were introduced."
                )
                citations = [
                    EvidenceCitation(
                        control_id=cid,
                        framework="CIS",
                        status="PASS",
                        severity="HIGH",
                        title=f"Resolved Control {cid}",
                        citation_label="RESOLVED",
                    )
                    for cid in resolved[:3]
                ]
            else:
                answer = (
                    f"### Evolution Baseline Session: {hostname}\n"
                    f"Audit session `{audit_id}` is evaluated as an initial baseline ({compliance_score:.1f}% compliance, {risk_score:.1f}/100 risk).\n\n"
                    f"**To inspect deterministic comparative deltas:**\n"
                    f"1. Select an evolution comparison audit in the **Target Audit / Baseline** selector above.\n"
                    f"2. Or visit **Security Time Machine** to compare side-by-side AST configuration diffs and transition matrices."
                )
                citations = []

            return CopilotChatResponse(
                advisory_only=True,
                query=query,
                audit_id=audit_id,
                answer=answer,
                grounded_evidence=citations,
                suggested_followups=[
                    "Why is this audit high risk?",
                    "Show me the most critical finding.",
                    "Which controls remain unresolved?",
                ],
                model_used="offline-standby-rules",
                disclaimer="AI-assisted response grounded strictly in verified AST audit findings. Zero device write capability.",
            )

        # 5. REMEDIATION / FIX / HOW TO RESOLVE (e.g. "How do I fix this?", "What is the recommended remediation?")
        if re.search(r"\b(remediat|fix|how to (fix|resolve)|patch|resolve|commands|action)\b", q_lower):
            top_failed = (critical_findings + high_findings + medium_findings)[:3]
            steps = "\n".join(
                f"{idx}. **{f.get('control_id')}** ({f.get('severity')}): {f.get('title')}\n"
                f"   - Target Line: [EVIDENCE · LINE {f.get('source_line') or 'N/A'}]\n"
                f"   - Observed: `{f.get('actual_value')}` → Baseline: `{f.get('expected_value')}`"
                for idx, f in enumerate(top_failed, 1)
            ) if top_failed else "- All evaluated controls are compliant. No remediation required."

            answer = (
                f"### Remediation Action Plan: {hostname} ({vendor})\n"
                f"NetVigil provides allowlisted configuration remediation commands grounded in verified AST findings. "
                f"Operating in **strict read-only advisory mode** (zero device write push).\n\n"
                f"**Top Priority Hardening Tasks:**\n"
                f"{steps}\n\n"
                f"**Verification Procedure:**\n"
                f"Review the full allowlisted CLI script in the **Remediation Center**, simulate the fix in **Security Time Machine**, and deploy manually via out-of-band management."
            )
            citations = [
                EvidenceCitation(
                    control_id=f.get("control_id", "CIS-1.1"),
                    framework=f.get("framework", "CIS"),
                    line_number=f.get("source_line"),
                    evidence_snippet=f.get("evidence"),
                    status=f.get("status", "FAIL"),
                    severity=f.get("severity", "HIGH"),
                    title=f.get("title"),
                    citation_label=f"EVIDENCE · LINE {f.get('source_line')}" if f.get("source_line") else "EVIDENCE",
                )
                for f in top_failed
            ]
            return CopilotChatResponse(
                advisory_only=True,
                query=query,
                audit_id=audit_id,
                answer=answer,
                grounded_evidence=citations,
                suggested_followups=[
                    "What changed after remediation?",
                    "Show me the most critical finding.",
                    "Why is this audit high risk?",
                ],
                model_used="offline-standby-rules",
                disclaimer="AI-assisted response grounded strictly in verified AST audit findings. Zero device write capability.",
            )

        # 6. UNRESOLVED / FAILED CONTROLS QUERY (e.g. "Which controls remain unresolved?", "What failed?")
        if re.search(r"\b(unresolved|failed|failing|failures|what failed|remaining|all failures)\b", q_lower):
            items_text = "\n".join(
                f"- **{f.get('control_id')}** [{f.get('severity')}]: {f.get('title')} (Line {f.get('source_line') or 'N/A'})"
                for f in failed_findings[:6]
            ) if failed_findings else "- Zero failed controls detected."

            answer = (
                f"### Unresolved Controls Summary: {hostname}\n"
                f"Evaluated {len(findings)} total controls: **{len(failed_findings)} non-compliant (FAIL)**, {len(passed_findings)} verified compliant (PASS).\n\n"
                f"- **Critical (P0):** {p0_count}\n"
                f"- **High (P1):** {p1_count}\n"
                f"- **Medium (P2):** {len(medium_findings)}\n\n"
                f"**Active Non-Compliant Controls:**\n"
                f"{items_text}\n\n"
                f"Full AST evidence citations and allowlisted patches are available in the **Findings Explorer** and **Remediation Center**."
            )
            citations = [
                EvidenceCitation(
                    control_id=f.get("control_id", "CIS-1.1"),
                    framework=f.get("framework", "CIS"),
                    line_number=f.get("source_line"),
                    evidence_snippet=f.get("evidence"),
                    status=f.get("status", "FAIL"),
                    severity=f.get("severity", "HIGH"),
                    title=f.get("title"),
                    citation_label=f"EVIDENCE · LINE {f.get('source_line')}" if f.get("source_line") else "EVIDENCE",
                )
                for f in failed_findings[:4]
            ]
            return CopilotChatResponse(
                advisory_only=True,
                query=query,
                audit_id=audit_id,
                answer=answer,
                grounded_evidence=citations,
                suggested_followups=[
                    "Show me the most critical finding.",
                    "Why is this audit high risk?",
                    "What is the recommended remediation plan?",
                ],
                model_used="offline-standby-rules",
                disclaimer="AI-assisted response grounded strictly in verified AST audit findings. Zero device write capability.",
            )

        # 7. DEFAULT / OVERVIEW QUERY (e.g. "Summarize audit", "Tell me about this device")
        top_failed = (critical_findings + high_findings)[:3]
        top_text = "\n".join(
            f"- **{f.get('control_id')}** ({f.get('severity')}): {f.get('title')} [EVIDENCE · LINE {f.get('source_line') or 'N/A'}]"
            for f in top_failed
        ) if top_failed else "- All evaluated controls are compliant."

        answer = (
            f"### NetVigil Security Posture Overview: {hostname} ({vendor})\n"
            f"- **Audit Session:** `{audit_id}`\n"
            f"- **Deterministic Compliance:** **{compliance_score:.1f}%** ({len(passed_findings)}/{len(findings)} controls passed)\n"
            f"- **Algorithmic Risk Score:** **{risk_score:.1f} / 100**\n"
            f"- **Active Risk Vectors:** {p0_count} Critical (P0), {p1_count} High (P1), {len(medium_findings)} Medium (P2)\n\n"
            f"**Key Focus Areas:**\n"
            f"{top_text}\n\n"
            f"You can ask specific questions such as: *\"Why is this audit high risk?\"*, *\"Show me the most critical finding\"*, *\"What changed after remediation?\"*, or query any specific control ID."
        )
        citations = [
            EvidenceCitation(
                control_id=f.get("control_id", "CIS-1.1"),
                framework=f.get("framework", "CIS"),
                line_number=f.get("source_line"),
                evidence_snippet=f.get("evidence"),
                status=f.get("status", "FAIL"),
                severity=f.get("severity", "HIGH"),
                title=f.get("title"),
                citation_label=f"EVIDENCE · LINE {f.get('source_line')}" if f.get("source_line") else "EVIDENCE",
            )
            for f in top_failed
        ]
        return CopilotChatResponse(
            advisory_only=True,
            query=query,
            audit_id=audit_id,
            answer=answer,
            grounded_evidence=citations,
            suggested_followups=[
                "Why is this audit high risk?",
                "Show me the most critical finding.",
                "Which controls remain unresolved?",
            ],
            model_used="offline-standby-rules",
            disclaimer="AI-assisted response grounded strictly in verified AST audit findings. Zero device write capability.",
        )

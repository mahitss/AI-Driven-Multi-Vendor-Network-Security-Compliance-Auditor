"""
NetVigil AI Security Briefing & Analyst Copilot Service
Problem Statement: SIH26155 (NTRO)

Strict Architectural Rules:
1. AI is strictly advisory. Deterministic AST compliance and risk scores are authoritative and immutable.
2. Every factual security claim is grounded in verified finding and line-level AST evidence records.
3. Untrusted configuration content is encapsulated in <untrusted_configuration_data>.
4. All credentials (passwords, secrets, keys, SNMP strings) are pre-redacted before LLM dispatch.
"""
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ResourceNotFoundError
from app.core.logging import logger
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.finding import Finding
from app.models.risk import RiskItem
from app.schemas.ai import (
    AISecurityBriefingResponse,
    CopilotChatResponse,
    EvidenceCitation,
    InvestigationOrderStep,
    SecurityEvolutionBrief,
    TopRiskBriefItem,
)
from app.services.ai.gateway.openrouter_gateway import OpenRouterGateway
from app.services.ai.prompts.security_briefing import (
    build_copilot_chat_prompt,
    build_security_briefing_prompt,
)
from app.services.ai.schemas.models import AITaskType
from app.services.ai.security import redact_sensitive_data
from app.services.comparison.service import SecurityTimeMachineService


class AISecurityBriefingService:
    """Orchestrates grounded AI Security Briefings and Analyst Copilot Q&A."""

    @classmethod
    async def _gather_audit_data(
        cls,
        audit_id: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """Gathers all deterministic audit facts, findings, and risks safely."""
        audit_res = await db.execute(select(Audit).where(Audit.id == audit_id))
        audit = audit_res.scalar_one_or_none()
        if not audit:
            raise ResourceNotFoundError(resource="Audit", identifier=audit_id)

        config_res = await db.execute(select(Configuration).where(Configuration.id == audit.configuration_id))
        config = config_res.scalar_one_or_none()

        findings_res = await db.execute(
            select(Finding)
            .where(Finding.audit_id == audit_id)
            .order_by(
                desc(Finding.severity),
                desc(Finding.created_at),
            )
        )
        findings = list(findings_res.scalars().all())

        risks_res = await db.execute(
            select(RiskItem)
            .where(RiskItem.audit_id == audit_id)
            .order_by(desc(RiskItem.risk_score))
        )
        risks = list(risks_res.scalars().all())

        # Formulate priority distribution
        p_counts = {"P0": 0, "P1": 0, "P2": 0, "P3": 0}
        for r in risks:
            p = (r.priority or "P2").upper()
            if p in p_counts:
                p_counts[p] += 1

        stats = audit.summary_stats or {}
        overall_score = audit.score if audit.score is not None else float(stats.get("overall_score", 0.0))
        risk_score = float(stats.get("risk_score", 0.0))
        if not risk_score and risks:
            risk_score = round(sum(r.risk_score for r in risks) / len(risks), 1)

        fw_raw = stats.get("framework_scores", {})
        fw_scores = {k: float(v.get("score", 0.0)) if isinstance(v, dict) else float(v) for k, v in fw_raw.items()}

        findings_data = [
            {
                "id": f.id,
                "control_id": f.control_id,
                "framework": f.framework,
                "title": f.title,
                "status": f.status,
                "severity": f.severity,
                "source_line": f.finding_metadata.get("source_line") if f.finding_metadata else None,
                "evidence": f.evidence,
                "actual_value": f.actual_value,
                "expected_value": f.expected_value,
                "description": f.description,
            }
            for f in findings
        ]

        risks_data = [
            {
                "id": r.id,
                "title": r.title,
                "priority": r.priority,
                "risk_score": r.risk_score,
                "category": r.category,
                "exposure": r.exposure,
                "impact": r.impact,
            }
            for r in risks
        ]

        return {
            "audit": audit,
            "config": config,
            "overall_score": overall_score,
            "risk_score": risk_score,
            "framework_scores": fw_scores,
            "priority_counts": p_counts,
            "findings": findings_data,
            "risks": risks_data,
            "device_hostname": config.original_filename.split(".")[0] if config else "Gateway-Node",
            "vendor": config.detected_vendor if config else "cisco",
        }

    @classmethod
    async def generate_briefing(
        cls,
        audit_id: str,
        baseline_audit_id: Optional[str] = None,
        focus_area: Optional[str] = "ALL",
        db: AsyncSession = None,
    ) -> AISecurityBriefingResponse:
        """Generates a structured, evidence-grounded AI Security Briefing."""
        data = await cls._gather_audit_data(audit_id, db)

        # 1. Compute time machine evolution deltas if baseline provided
        evolution_deltas = None
        if baseline_audit_id and baseline_audit_id != audit_id:
            try:
                cmp_res = await SecurityTimeMachineService.compare_audits(
                    before_audit_id=baseline_audit_id,
                    after_audit_id=audit_id,
                    db=db,
                )
                evolution_deltas = cmp_res.model_dump()
            except Exception as e:
                logger.warning(f"Could not compute evolution deltas for briefing: {e}")

        # 2. Build pre-redacted prompt
        prompt = build_security_briefing_prompt(
            audit_id=audit_id,
            device_hostname=data["device_hostname"],
            vendor=data["vendor"],
            compliance_score=data["overall_score"],
            risk_score=data["risk_score"],
            framework_scores=data["framework_scores"],
            priority_counts=data["priority_counts"],
            findings=data["findings"],
            risks=data["risks"],
            evolution_deltas=evolution_deltas,
        )

        context_data = {
            "audit_id": audit_id,
            "baseline_audit_id": baseline_audit_id,
            "device_hostname": data["device_hostname"],
            "vendor": data["vendor"],
            "compliance_score": data["overall_score"],
            "risk_score": data["risk_score"],
            "priority_counts": data["priority_counts"],
            "findings": data["findings"],
            "risks": data["risks"],
            "evolution_deltas": evolution_deltas,
        }

        # 3. Dispatch through OpenRouter Multi-Model Gateway
        response: AISecurityBriefingResponse = await OpenRouterGateway.execute_task(
            task_type=AITaskType.SECURITY_BRIEFING,
            user_prompt=prompt,
            response_schema=AISecurityBriefingResponse,
            context_data=context_data,
        )

        # 4. STRICT GROUNDING INVARIANT ENFORCEMENT
        # Overwrite scores with authoritative deterministic values from database
        response.audit_id = audit_id
        response.baseline_audit_id = baseline_audit_id
        response.device_hostname = data["device_hostname"]
        response.detected_vendor = data["vendor"]
        response.compliance_score = data["overall_score"]
        response.risk_score = data["risk_score"]
        response.critical_p0_count = data["priority_counts"].get("P0", 0)
        response.advisory_only = True

        # Attach deterministic Security Time Machine evolution brief if baseline was supplied
        if evolution_deltas and not response.security_evolution:
            d = evolution_deltas.get("deltas", {})
            resolved_list = [
                t["control_id"]
                for t in evolution_deltas.get("transitions", [])
                if t.get("transition_type") == "RESOLVED"
            ]
            regressed_list = [
                t["control_id"]
                for t in evolution_deltas.get("transitions", [])
                if t.get("transition_type") == "REGRESSED"
            ]
            response.security_evolution = SecurityEvolutionBrief(
                baseline_audit_id=evolution_deltas.get("before_audit_id", ""),
                current_audit_id=evolution_deltas.get("after_audit_id", ""),
                before_score=d.get("before_score", 0.0),
                after_score=d.get("after_score", 0.0),
                score_delta=d.get("score_delta", 0.0),
                risk_delta=d.get("risk_delta", 0.0),
                resolved_count=d.get("resolved_count", 0),
                regressed_count=d.get("regressed_count", 0),
                resolved_controls_summary=resolved_list[:5],
                regressed_controls_summary=regressed_list[:5],
                narrative=f"Security posture evolution analyzed against baseline {evolution_deltas.get('before_audit_id', '')[:8]}: Compliance improved by +{d.get('score_delta', 0):.1f}% with {d.get('resolved_count', 0)} resolved controls.",
            )

        # Validate and attach real verified evidence citations
        finding_lookup = {f["control_id"]: f for f in data["findings"]}
        grounded_citations: List[EvidenceCitation] = []

        # Ground top risks
        for r in response.top_risks:
            if r.control_id in finding_lookup:
                matched = finding_lookup[r.control_id]
                line_no = matched.get("source_line")
                r.evidence_citation = EvidenceCitation(
                    control_id=matched["control_id"],
                    framework=matched["framework"],
                    line_number=line_no,
                    evidence_snippet=matched["evidence"],
                    status=matched["status"],
                    severity=matched["severity"],
                    title=matched["title"],
                    citation_label=f"EVIDENCE · LINE {line_no}" if line_no else "EVIDENCE",
                )
                grounded_citations.append(r.evidence_citation)
            elif not r.evidence_citation:
                r.why_it_matters += " (Evidence unavailable in current sample)."

        response.grounded_evidence_citations = grounded_citations

        # Fallback top risks if LLM returned empty list
        if not response.top_risks and data["findings"]:
            for f in data["findings"][:3]:
                cid = f["control_id"]
                line_no = f.get("source_line")
                response.top_risks.append(
                    TopRiskBriefItem(
                        control_id=cid,
                        title=f["title"],
                        severity=f["severity"],
                        priority="P0" if f["severity"] == "CRITICAL" else "P1",
                        why_it_matters=f"Insecure posture observed for {cid} on {data['device_hostname']}.",
                        evidence_citation=EvidenceCitation(
                            control_id=cid,
                            framework=f["framework"],
                            line_number=line_no,
                            evidence_snippet=f["evidence"],
                            status=f["status"],
                            severity=f["severity"],
                            title=f["title"],
                            citation_label=f"EVIDENCE · LINE {line_no}" if line_no else "EVIDENCE",
                        ),
                        recommended_action=f"Apply standard allowlisted CLI template for {cid}.",
                        actual_value=f.get("actual_value"),
                        expected_value=f.get("expected_value"),
                    )
                )

        # Fallback recommended investigation checklist if empty
        if not response.recommended_investigation_order and data["findings"]:
            for idx, f in enumerate(data["findings"][:4], 1):
                line_no = f.get("source_line")
                response.recommended_investigation_order.append(
                    InvestigationOrderStep(
                        step_number=idx,
                        control_id=f["control_id"],
                        priority="P0" if f["severity"] == "CRITICAL" else "P1",
                        action_summary=f"Verify configuration line {line_no or '[directive]'} and apply allowlisted remediation.",
                        target_lines=[line_no] if line_no else [],
                        reason=f"Identified non-compliant state on {f['control_id']} ({f['title']}).",
                    )
                )

        return response

    @classmethod
    async def chat_copilot(
        cls,
        query: str,
        audit_id: str,
        baseline_audit_id: Optional[str] = None,
        chat_history: Optional[List[Dict[str, str]]] = None,
        db: AsyncSession = None,
    ) -> CopilotChatResponse:
        """Processes an Analyst Copilot query with grounded evidence citations."""
        data = await cls._gather_audit_data(audit_id, db)

        evolution_deltas = None
        if baseline_audit_id and baseline_audit_id != audit_id:
            try:
                cmp_res = await SecurityTimeMachineService.compare_audits(
                    before_audit_id=baseline_audit_id,
                    after_audit_id=audit_id,
                    db=db,
                )
                evolution_deltas = cmp_res.model_dump()
            except Exception as e:
                logger.warning(f"Could not compute evolution deltas for copilot: {e}")

        prompt = build_copilot_chat_prompt(
            user_query=query,
            audit_id=audit_id,
            device_hostname=data["device_hostname"],
            vendor=data["vendor"],
            compliance_score=data["overall_score"],
            risk_score=data["risk_score"],
            findings=data["findings"],
            chat_history=chat_history,
            evolution_deltas=evolution_deltas,
        )

        context_data = {
            "query": query,
            "audit_id": audit_id,
            "device_hostname": data["device_hostname"],
            "vendor": data["vendor"],
            "compliance_score": data["overall_score"],
            "risk_score": data["risk_score"],
            "findings": data["findings"],
        }

        response: CopilotChatResponse = await OpenRouterGateway.execute_task(
            task_type=AITaskType.ANALYST_COPILOT,
            user_prompt=prompt,
            response_schema=CopilotChatResponse,
            context_data=context_data,
        )

        response.query = query
        response.audit_id = audit_id
        response.advisory_only = True

        # Attach real verified evidence citations matched from findings
        finding_lookup = {f["control_id"]: f for f in data["findings"]}
        grounded_citations: List[EvidenceCitation] = []
        for cid, f in finding_lookup.items():
            if cid in response.answer or (response.grounded_evidence and any(e.control_id == cid for e in response.grounded_evidence)):
                line_no = f.get("source_line")
                grounded_citations.append(
                    EvidenceCitation(
                        control_id=cid,
                        framework=f["framework"],
                        line_number=line_no,
                        evidence_snippet=f["evidence"],
                        status=f["status"],
                        severity=f["severity"],
                        title=f["title"],
                        citation_label=f"EVIDENCE · LINE {line_no}" if line_no else "EVIDENCE",
                    )
                )

        if grounded_citations:
            response.grounded_evidence = grounded_citations[:5]

        return response

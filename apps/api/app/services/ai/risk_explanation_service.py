"""
Evidence-Grounded Risk Explanation Service
Problem Statement: SIH26155 (NTRO)

Strict Invariant:
AI is an advisory layer only. It cannot alter the deterministic risk score or priority band.
"""
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import ResourceNotFoundError
from app.models.finding import Finding
from app.models.risk import RiskItem
from app.schemas.ai import RiskExplanationResponse
from app.services.ai.gateway.openrouter_gateway import OpenRouterGateway
from app.services.ai.schemas.models import AITaskType


class RiskExplanationService:
    """Generates strictly evidence-grounded technical explanations for correlated risk intelligence."""

    @classmethod
    async def explain_risk(
        cls,
        risk_id: str,
        db: AsyncSession,
    ) -> RiskExplanationResponse:
        # 1. Fetch Risk Item
        stmt = select(RiskItem).where(RiskItem.id == risk_id)
        res = await db.execute(stmt)
        risk = res.scalars().first()

        if not risk:
            raise ResourceNotFoundError(resource="RiskItem", identifier=risk_id)

        # 2. Fetch Contributing Findings
        contributing_titles = []
        finding_id_list = getattr(risk, "finding_ids", None) or getattr(risk, "contributing_findings", [])
        if finding_id_list:
            f_stmt = select(Finding).where(Finding.id.in_(finding_id_list))
            f_res = await db.execute(f_stmt)
            findings = f_res.scalars().all()
            contributing_titles = [f"{f.control_id} - {f.title} (Severity: {f.severity})" for f in findings]

        # 3. Build Prompt
        user_prompt = f"""<<<UNTRUSTED_CONFIGURATION_DATA>>>
RISK_TITLE: {risk.title}
DETERMINISTIC_SCORE: {risk.risk_score}
PRIORITY: {risk.priority}
CATEGORY: {risk.category}
DESCRIPTION: {risk.description}
CONTRIBUTING_FINDINGS:
{chr(10).join(f"- {t}" for t in contributing_titles) if contributing_titles else "- Direct exposure finding"}
EVIDENCE_SUMMARY: {risk.evidence_summary or "Configuration policy deviation"}
<<<VERIFIED_EVIDENCE_DATA>>>

Explain why this risk is prioritized, analyze the attack surface, evaluate business/operational impact, and explain why remediation matters.
You MUST NOT change the risk score or priority."""

        context_data = {
            "risk_id": risk.id,
            "title": risk.title,
            "risk_score": risk.risk_score,
            "priority": risk.priority,
            "contributing_findings": contributing_titles,
            "evidence_summary": risk.evidence_summary,
        }

        # 4. Dispatch through OpenRouter Multi-Model Gateway
        explanation = await OpenRouterGateway.execute_task(
            task_type=AITaskType.RISK_CONTEXT_EXPLANATION,
            user_prompt=user_prompt,
            response_schema=RiskExplanationResponse,
            context_data=context_data,
        )

        # 5. Guarantee deterministic invariants
        explanation.risk_id = risk.id
        explanation.title = risk.title
        explanation.deterministic_risk_score = risk.risk_score
        explanation.priority = risk.priority
        if not explanation.contributing_findings_analysis:
            explanation.contributing_findings_analysis = contributing_titles

        return explanation

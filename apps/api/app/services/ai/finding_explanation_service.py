"""
Evidence-Grounded Finding Explanation Service
Problem Statement: SIH26155 (NTRO)

Strict Invariant:
AI is an advisory layer only. It cannot alter the finding's deterministic compliance status.
"""
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import ResourceNotFoundError
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.finding import Finding
from app.schemas.ai import FindingExplanationResponse
from app.services.ai.gateway.openrouter_gateway import OpenRouterGateway
from app.services.ai.prompts.finding_explanation import (
    FINDING_EXPLANATION_SYSTEM_PROMPT,
    build_finding_explanation_prompt,
)
from app.services.ai.schemas.models import AITaskType


class FindingExplanationService:
    """Generates strictly evidence-grounded technical explanations for compliance findings."""

    @classmethod
    async def explain_finding(
        cls,
        finding_id: str,
        db: AsyncSession,
    ) -> FindingExplanationResponse:
        # 1. Fetch Finding
        stmt = select(Finding).where(Finding.id == finding_id)
        res = await db.execute(stmt)
        finding = res.scalars().first()

        if not finding:
            raise ResourceNotFoundError(resource="Finding", identifier=finding_id)

        # 2. Fetch associated Audit and Configuration to identify vendor
        vendor = "generic"
        audit_stmt = select(Audit).where(Audit.id == finding.audit_id)
        audit_res = await db.execute(audit_stmt)
        audit_rec = audit_res.scalars().first()

        if audit_rec and audit_rec.configuration_id:
            config_stmt = select(Configuration).where(Configuration.id == audit_rec.configuration_id)
            config_res = await db.execute(config_stmt)
            config_rec = config_res.scalars().first()
            if config_rec:
                vendor = config_rec.detected_vendor or "cisco"

        # 3. Extract evidence and citation metadata
        finding_meta = finding.finding_metadata or {}
        evidence_list: List[str] = finding_meta.get("evidence_list", [])
        if not evidence_list and finding.evidence:
            evidence_list = [finding.evidence]

        source_lines: List[int] = finding_meta.get("source_lines", [])
        source_meta = finding_meta.get("source", {})
        document_citation = f"{source_meta.get('document', finding.framework)} ({source_meta.get('reference', 'General')})"

        # 4. Build prompt
        user_prompt = build_finding_explanation_prompt(
            finding_title=finding.title,
            framework=finding.framework,
            control_id=finding.control_id,
            severity=finding.severity,
            status=finding.status,
            actual_value=finding.actual_value or "Unconfigured",
            expected_value=finding.expected_value or "Baseline compliance requirement",
            evidence=evidence_list,
            source_lines=source_lines,
            document_citation=document_citation,
            vendor=vendor,
        )

        context_data = {
            "title": finding.title,
            "control_id": finding.control_id,
            "evidence": finding.evidence,
            "framework": finding.framework,
            "severity": finding.severity,
            "status": finding.status,
        }

        # 5. Dispatch through OpenRouter Multi-Model Gateway
        explanation = await OpenRouterGateway.execute_task(
            task_type=AITaskType.FINDING_EXPLANATION,
            user_prompt=user_prompt,
            response_schema=FindingExplanationResponse,
            context_data=context_data,
        )

        # 6. Ensure evidence used and source lines are accurately reflected
        explanation.evidence_used = evidence_list
        explanation.source_lines = source_lines

        return explanation

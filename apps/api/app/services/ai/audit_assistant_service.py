"""
Read-Only Audit Co-Pilot & Natural Language Assistant Service
Problem Statement: SIH26155 (NTRO)

Strict Security Boundaries:
- The LLM has zero raw SQL or shell access.
- Safe read-only functions gather structured audit data.
- The assistant links answers directly to verified finding control IDs.
"""
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import ResourceNotFoundError
from app.models.audit import Audit
from app.models.finding import Finding
from app.schemas.ai import AuditAssistantQueryResponse
from app.services.ai.gateway.openrouter_gateway import OpenRouterGateway
from app.services.ai.prompts.audit_assistant import (
    AUDIT_ASSISTANT_SYSTEM_PROMPT,
    build_audit_assistant_prompt,
)
from app.services.ai.schemas.models import AITaskType


class SafeAuditTools:
    """Read-only data retrieval tools for the audit assistant."""

    @staticmethod
    async def get_audit_summary(audit_id: str, db: AsyncSession) -> Optional[Audit]:
        stmt = select(Audit).where(Audit.id == audit_id)
        res = await db.execute(stmt)
        return res.scalars().first()

    @staticmethod
    async def get_relevant_findings(
        audit_id: str,
        db: AsyncSession,
        limit: int = 30,
    ) -> List[Dict[str, Any]]:
        # Prioritize failed and unknown findings
        stmt = (
            select(Finding)
            .where(Finding.audit_id == audit_id)
            .order_by(Finding.status, desc(Finding.severity))
            .limit(limit)
        )
        res = await db.execute(stmt)
        findings = res.scalars().all()

        return [
            {
                "id": f.id,
                "framework": f.framework,
                "control_id": f.control_id,
                "title": f.title,
                "status": f.status,
                "severity": f.severity,
                "actual_value": f.actual_value,
                "expected_value": f.expected_value,
            }
            for f in findings
        ]


class AuditAssistantService:
    """Coordinates natural-language query resolution grounded in actual audit data."""

    @classmethod
    async def answer_query(
        cls,
        query: str,
        audit_id: str,
        db: AsyncSession,
    ) -> AuditAssistantQueryResponse:
        # 1. Fetch audit record using safe tool
        audit = await SafeAuditTools.get_audit_summary(audit_id, db)
        if not audit:
            raise ResourceNotFoundError(resource="Audit", identifier=audit_id)

        # 2. Fetch relevant finding records using safe tool
        findings = await SafeAuditTools.get_relevant_findings(audit_id, db)

        # 3. Extract stats
        stats = audit.summary_stats or {}
        overall_score = audit.score or stats.get("overall_score", 0.0)
        fw_scores_raw = stats.get("framework_scores", {})
        fw_scores = {k: v.get("score", 0.0) for k, v in fw_scores_raw.items()}
        sev_stats = stats.get("severity_breakdown", {})
        status_counts = stats.get("status_breakdown", {})

        # 4. Build grounded prompt
        user_prompt = build_audit_assistant_prompt(
            user_query=query,
            audit_id=audit.id,
            overall_score=overall_score,
            framework_scores=fw_scores,
            severity_breakdown=sev_stats,
            status_counts=status_counts,
            relevant_findings=findings,
        )

        context_data = {
            "query": query,
            "audit_id": audit_id,
            "findings_count": len(findings),
            "cited_controls": [f["control_id"] for f in findings[:5]],
        }

        # 5. Dispatch through OpenRouter Multi-Model Gateway
        response = await OpenRouterGateway.execute_task(
            task_type=AITaskType.SECURITY_ASSISTANT,
            user_prompt=user_prompt,
            response_schema=AuditAssistantQueryResponse,
            context_data=context_data,
        )

        response.query = query
        response.audit_id = audit_id
        response.sources_count = len(response.supporting_findings)

        return response

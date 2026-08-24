"""
Evidence-Grounded Remediation Explanation Service
Problem Statement: SIH26155 (NTRO)

Strict Invariant:
AI is an advisory layer only. It cannot generate arbitrary executable CLI commands or push configs.
"""
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import ResourceNotFoundError
from app.models.remediation import RemediationProposal
from app.schemas.ai import RemediationExplanationResponse
from app.services.ai.gateway.openrouter_gateway import OpenRouterGateway
from app.services.ai.schemas.models import AITaskType


class RemediationExplanationService:
    """Generates strictly evidence-grounded technical explanations for verified remediation diffs."""

    @classmethod
    async def explain_remediation(
        cls,
        remediation_id: str,
        db: AsyncSession,
    ) -> RemediationExplanationResponse:
        # 1. Fetch Remediation Proposal
        stmt = select(RemediationProposal).where(RemediationProposal.id == remediation_id)
        res = await db.execute(stmt)
        rem = res.scalars().first()

        if not rem:
            raise ResourceNotFoundError(resource="RemediationProposal", identifier=remediation_id)

        # 2. Build Prompt
        user_prompt = f"""<<<UNTRUSTED_CONFIGURATION_DATA>>>
CONTROL_ID: {rem.normalized_control}
VENDOR: {rem.vendor}
TITLE: {rem.title}
APPLY_COMMANDS:
{rem.remediation_commands}
ROLLBACK_COMMANDS:
{rem.rollback_commands or "None"}
WHY_RECOMMENDED: {rem.why_recommended}
POTENTIAL_IMPACT: {rem.potential_impact}
VERIFICATION_STEPS: {rem.verification_steps}
<<<VERIFIED_EVIDENCE_DATA>>>

Explain what configuration changes are made, why this change is safe for network operations, what security property is restored, and what the operator should verify.
You MUST NOT change the CLI commands or synthesize unverified syntax."""

        context_data = {
            "remediation_id": rem.id,
            "control_id": rem.normalized_control,
            "vendor": rem.vendor,
            "remediation_commands": rem.remediation_commands,
            "why_recommended": rem.why_recommended,
            "potential_impact": rem.potential_impact,
            "verification_steps": rem.verification_steps,
        }

        # 3. Dispatch through OpenRouter Multi-Model Gateway
        explanation = await OpenRouterGateway.execute_task(
            task_type=AITaskType.REMEDIATION_EXPLANATION,
            user_prompt=user_prompt,
            response_schema=RemediationExplanationResponse,
            context_data=context_data,
        )

        # 4. Guarantee deterministic invariants
        explanation.remediation_id = rem.id
        explanation.control_id = rem.normalized_control
        explanation.vendor = rem.vendor

        return explanation

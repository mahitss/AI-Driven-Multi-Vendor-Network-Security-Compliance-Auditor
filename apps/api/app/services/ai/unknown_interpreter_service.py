"""
Unknown Configuration Interpretation Service
Problem Statement: SIH26155 (NTRO)

Foundation for NetVigil's Adaptive Training system:
- Classifies unparsed syntax into candidate normalized categories.
- Evaluates confidence thresholds without automatically trusting low-confidence outputs.
"""
from typing import List, Optional
from app.core.config import settings
from app.schemas.ai import UnknownConfigInterpretationResponse
from app.services.ai.gateway.openrouter_gateway import OpenRouterGateway
from app.services.ai.prompts.unknown_configuration import (
    UNKNOWN_CONFIG_SYSTEM_PROMPT,
    build_unknown_config_prompt,
)
from app.services.ai.schemas.models import AITaskType


class UnknownConfigInterpreterService:
    """Interprets unknown and custom vendor syntax for adaptive compliance mapping."""

    @classmethod
    async def interpret_command(
        cls,
        raw_command: str,
        vendor_hint: str = "cisco",
        platform_hint: Optional[str] = None,
        nearby_context: Optional[List[str]] = None,
    ) -> UnknownConfigInterpretationResponse:
        # 1. Build context-minimized prompt
        user_prompt = build_unknown_config_prompt(
            raw_command=raw_command,
            vendor_hint=vendor_hint,
            platform_hint=platform_hint,
            nearby_context=nearby_context,
        )

        context_data = {
            "raw_command": raw_command,
            "vendor_hint": vendor_hint,
            "platform_hint": platform_hint,
        }

        # 2. Dispatch through OpenRouter Multi-Model Gateway
        interpretation = await OpenRouterGateway.execute_task(
            task_type=AITaskType.UNKNOWN_SYNTAX_CLASSIFICATION,
            user_prompt=user_prompt,
            response_schema=UnknownConfigInterpretationResponse,
            context_data=context_data,
        )

        # 3. Calculate confidence tier
        if interpretation.confidence >= settings.CONFIDENCE_HIGH_THRESHOLD:
            interpretation.confidence_tier = "high"
        elif interpretation.confidence >= settings.CONFIDENCE_REVIEW_THRESHOLD:
            interpretation.confidence_tier = "review"
        else:
            interpretation.confidence_tier = "low"
        # 4. Strict Allowlist Safety Enforcement
        if interpretation.candidate_property:
            from app.services.training.allowlist import is_property_allowlisted
            if not is_property_allowlisted(interpretation.candidate_property):
                interpretation.status = "rejected_by_allowlist"
                interpretation.confidence_tier = "low"
                interpretation.disclaimer = f"Candidate property '{interpretation.candidate_property}' rejected: Not present in normalized safety allowlist."

        # Ensure original evidence is retained
        if not interpretation.evidence:
            interpretation.evidence = [raw_command.strip()]

        return interpretation

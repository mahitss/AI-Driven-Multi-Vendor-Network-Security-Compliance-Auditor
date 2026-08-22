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
from app.services.ai.manager import get_ai_provider
from app.services.ai.prompts.unknown_configuration import (
    UNKNOWN_CONFIG_SYSTEM_PROMPT,
    build_unknown_config_prompt,
)


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

        # 2. Call AI Provider
        provider = get_ai_provider()
        interpretation = await provider.generate_structured(
            schema=UnknownConfigInterpretationResponse,
            system_prompt=UNKNOWN_CONFIG_SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )

        # 3. Calculate confidence tier
        if interpretation.confidence >= settings.CONFIDENCE_HIGH_THRESHOLD:
            interpretation.confidence_tier = "high"
        elif interpretation.confidence >= settings.CONFIDENCE_REVIEW_THRESHOLD:
            interpretation.confidence_tier = "review"
        else:
            interpretation.confidence_tier = "low"
            if interpretation.status == "candidate":
                interpretation.status = "uncertain"

        # Ensure original evidence is retained
        if not interpretation.evidence:
            interpretation.evidence = [raw_command.strip()]

        return interpretation

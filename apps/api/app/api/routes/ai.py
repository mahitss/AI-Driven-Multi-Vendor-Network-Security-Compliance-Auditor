"""
AI Intelligence & Co-Pilot API Routes
Problem Statement: SIH26155 (NTRO)
"""
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import DatabaseDep
from app.core.config import settings
from app.core.errors import ResourceNotFoundError
from app.models.configuration import Configuration
from app.schemas.ai import (
    AIHealthResponse,
    AuditAssistantQueryRequest,
    AuditAssistantQueryResponse,
    FindingExplanationResponse,
    UnknownConfigInterpretationRequest,
    UnknownConfigInterpretationResponse,
)
from app.services.ai.audit_assistant_service import AuditAssistantService
from app.services.ai.finding_explanation_service import FindingExplanationService
from app.services.ai.manager import get_ai_provider
from app.services.ai.unknown_interpreter_service import UnknownConfigInterpreterService

router = APIRouter(prefix="/ai", tags=["AI Intelligence Layer"])


@router.get(
    "/status",
    response_model=AIHealthResponse,
    summary="Get current AI provider and model status",
)
async def get_ai_status() -> AIHealthResponse:
    """Retrieve operational state, active provider, and configuration metadata."""
    provider = get_ai_provider()
    health = await provider.check_health()
    return AIHealthResponse(
        provider=health.get("provider", settings.AI_PROVIDER),
        model=health.get("model", settings.AI_MODEL),
        status=health.get("status", "online"),
        has_api_key=health.get("has_api_key", bool(settings.OPENROUTER_API_KEY)),
        temperature=settings.AI_TEMPERATURE,
        timeout_seconds=settings.AI_TIMEOUT_SECONDS,
    )


@router.post(
    "/findings/{finding_id}/explanation",
    response_model=FindingExplanationResponse,
    summary="Generate evidence-grounded technical explanation for finding",
)
async def explain_finding(
    finding_id: str,
    db: DatabaseDep,
) -> FindingExplanationResponse:
    """
    Generates an evidence-grounded explanation for a deterministic finding:
    - Grounded strictly in verified configuration lines.
    - Preserves deterministic compliance status invariant.
    - Returns structured summary, technical explanation, risk context, and remediation.
    """
    return await FindingExplanationService.explain_finding(finding_id=finding_id, db=db)


@router.post(
    "/audits/{audit_id}/chat",
    response_model=AuditAssistantQueryResponse,
    summary="Natural-language question answering for audit session",
)
async def query_audit_assistant(
    audit_id: str,
    payload: AuditAssistantQueryRequest,
    db: DatabaseDep,
) -> AuditAssistantQueryResponse:
    """
    Answers natural language queries about an active audit session:
    - Uses safe read-only application tools to gather findings and scores.
    - Cites supporting finding control IDs.
    - Zero permission for shell commands or database mutations.
    """
    return await AuditAssistantService.answer_query(
        query=payload.query,
        audit_id=audit_id,
        db=db,
    )


@router.post(
    "/interpret-syntax",
    response_model=UnknownConfigInterpretationResponse,
    summary="Interpret unknown or obscure vendor CLI syntax",
)
async def interpret_syntax(
    payload: UnknownConfigInterpretationRequest,
) -> UnknownConfigInterpretationResponse:
    """
    Classifies unknown syntax into candidate canonical security domains:
    - Calculates confidence score and candidate normalized fields.
    - Assigns confidence tier (high / review / low) for human-in-the-loop review.
    """
    return await UnknownConfigInterpreterService.interpret_command(
        raw_command=payload.raw_command,
        vendor_hint=payload.vendor_hint,
        platform_hint=payload.platform_hint,
        nearby_context=payload.nearby_context,
    )


@router.post(
    "/configurations/{config_id}/interpret-unknown",
    response_model=List[UnknownConfigInterpretationResponse],
    summary="Batch interpret all unknown items in an ingested configuration",
)
async def interpret_configuration_unknowns(
    config_id: str,
    db: DatabaseDep,
) -> List[UnknownConfigInterpretationResponse]:
    """Interprets all unparsed items associated with an ingested configuration file."""
    stmt = select(Configuration).where(Configuration.id == config_id)
    res = await db.execute(stmt)
    config = res.scalars().first()

    if not config:
        raise ResourceNotFoundError(resource="Configuration", identifier=config_id)

    unknown_items = config.unknown_items or []
    interpretations: List[UnknownConfigInterpretationResponse] = []

    for item in unknown_items[:10]:  # Limit batch to top 10 items for performance
        raw_text = item.get("raw_text", "")
        if raw_text.strip():
            interp = await UnknownConfigInterpreterService.interpret_command(
                raw_command=raw_text,
                vendor_hint=config.detected_vendor or "cisco",
                platform_hint=config.detected_platform,
            )
            interpretations.append(interp)

    return interpretations

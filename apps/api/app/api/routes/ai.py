"""
AI Intelligence & OpenRouter Multi-Model Gateway API Routes
Problem Statement: SIH26155 (NTRO)

Strict Security Invariants:
1. OpenRouter is the sole external AI provider.
2. AI is an advisory layer only. Deterministic compliance results cannot be overridden by AI.
3. Zero credentials or raw secrets are ever exposed in responses or logs.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
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
from app.services.ai.registry.model_registry import ModelInfo, ModelRegistry
from app.services.ai.telemetry.ai_telemetry import AITelemetryCollector, AITelemetrySummary
from app.services.ai.unknown_interpreter_service import UnknownConfigInterpreterService

router = APIRouter(prefix="/ai", tags=["AI Intelligence Gateway"])


class AIModelItemResponse(BaseModel):
    model_id: str
    role: str
    enabled: bool
    available: bool
    cost_tier: str
    reasoning_capability: str
    task_types: List[str]
    last_success: Optional[str] = None
    last_failure: Optional[str] = None
    last_latency_ms: Optional[float] = None
    failure_count: int


class AIGatewayHealthResponse(BaseModel):
    gateway_status: str  # "ONLINE", "DEGRADED", "OFFLINE_STANDBY"
    provider: str = "openrouter"
    has_api_key: bool
    total_models_configured: int
    available_models_count: int
    telemetry: AITelemetrySummary
    security_invariant: str = "AI is ADVISORY only. Deterministic AST compliance decision authority preserved."


@router.get(
    "/health",
    response_model=AIGatewayHealthResponse,
    summary="Get comprehensive AI Gateway status and telemetry",
)
async def get_ai_gateway_health() -> AIGatewayHealthResponse:
    """Retrieves live gateway health, model availability, and measured telemetry."""
    has_key = bool(settings.OPENROUTER_API_KEY and settings.OPENROUTER_API_KEY.strip())
    all_models = ModelRegistry.get_all_models()
    avail_count = sum(1 for m in all_models if m.available and m.enabled)

    if not has_key:
        gw_status = "OFFLINE_STANDBY"
    elif avail_count == len(all_models):
        gw_status = "ONLINE"
    elif avail_count > 0:
        gw_status = "DEGRADED"
    else:
        gw_status = "OFFLINE_STANDBY"

    return AIGatewayHealthResponse(
        gateway_status=gw_status,
        provider="openrouter",
        has_api_key=has_key,
        total_models_configured=len(all_models),
        available_models_count=avail_count,
        telemetry=AITelemetryCollector.get_summary(),
    )


@router.get(
    "/models",
    response_model=List[AIModelItemResponse],
    summary="List all 15 configured OpenRouter models and real-time health",
)
async def list_ai_models() -> List[AIModelItemResponse]:
    """Returns canonical model registry metadata, roles, and latency state."""
    models = ModelRegistry.get_all_models()
    return [
        AIModelItemResponse(
            model_id=m.model_id,
            role=m.role,
            enabled=m.enabled,
            available=m.available,
            cost_tier=m.cost_tier,
            reasoning_capability=m.reasoning_capability,
            task_types=[t.value for t in m.task_types],
            last_success=m.last_success.isoformat() if m.last_success else None,
            last_failure=m.last_failure.isoformat() if m.last_failure else None,
            last_latency_ms=m.last_latency_ms,
            failure_count=m.failure_count,
        )
        for m in models
    ]


@router.get(
    "/status",
    response_model=AIHealthResponse,
    summary="Get current AI provider and model status (legacy compatible)",
)
async def get_ai_status() -> AIHealthResponse:
    """Retrieve operational state, active provider, and configuration metadata."""
    has_key = bool(settings.OPENROUTER_API_KEY and settings.OPENROUTER_API_KEY.strip())
    return AIHealthResponse(
        provider="openrouter",
        model=settings.AI_MODEL,
        status="online" if has_key else "offline_standby",
        has_api_key=has_key,
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
    - Uses safe read-only tools to gather findings and scores.
    - Cites supporting finding control IDs.
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
    summary="Batch interpret all unknown lines extracted from a parsed configuration",
)
async def batch_interpret_unknown_config_lines(
    config_id: str,
    db: DatabaseDep,
) -> List[UnknownConfigInterpretationResponse]:
    """Runs unknown syntax classifier across all unrecognized configuration directives."""
    cfg = await db.get(Configuration, config_id)
    if not cfg:
        raise ResourceNotFoundError(resource="Configuration", identifier=config_id)

    unknown_directives = cfg.unknown_items or []
    if not unknown_directives:
        return []

    results = []
    for item in unknown_directives[:10]:  # Limit to 10 for batch responsiveness
        raw_cmd = item if isinstance(item, str) else item.get("raw_line", str(item))
        interp = await UnknownConfigInterpreterService.interpret_command(
            raw_command=raw_cmd,
            vendor_hint=cfg.detected_vendor or "cisco",
            platform_hint=cfg.detected_platform,
        )
        results.append(interp)

    return results

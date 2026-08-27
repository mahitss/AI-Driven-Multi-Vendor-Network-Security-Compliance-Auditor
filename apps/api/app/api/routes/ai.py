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
    RiskExplanationResponse,
    RemediationExplanationResponse,
    UnknownConfigInterpretationRequest,
    UnknownConfigInterpretationResponse,
    AISecurityBriefingRequest,
    AISecurityBriefingResponse,
    CopilotChatRequest,
    CopilotChatResponse,
)
from app.services.ai.audit_assistant_service import AuditAssistantService
from app.services.ai.finding_explanation_service import FindingExplanationService
from app.services.ai.risk_explanation_service import RiskExplanationService
from app.services.ai.remediation_explanation_service import RemediationExplanationService
from app.services.ai.security_briefing_service import AISecurityBriefingService
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
    "/explain-finding",
    response_model=FindingExplanationResponse,
    summary="Direct alias to explain finding by ID",
)
async def explain_finding_direct(
    finding_id: str,
    db: DatabaseDep,
) -> FindingExplanationResponse:
    """Direct alias for explain finding."""
    return await FindingExplanationService.explain_finding(finding_id=finding_id, db=db)


@router.post(
    "/classify-syntax",
    response_model=UnknownConfigInterpretationResponse,
    summary="Direct alias to classify unknown vendor syntax",
)
async def classify_syntax_direct(
    payload: UnknownConfigInterpretationRequest,
) -> UnknownConfigInterpretationResponse:
    """Direct alias for unknown syntax classification."""
    return await UnknownConfigInterpreterService.interpret_command(
        raw_command=payload.raw_command,
        vendor_hint=payload.vendor_hint,
        platform_hint=payload.platform_hint,
        nearby_context=payload.nearby_context,
    )


@router.post(
    "/assistant",
    response_model=AuditAssistantQueryResponse,
    summary="Direct alias for AI security assistant Q&A",
)
async def query_assistant_direct(
    payload: AuditAssistantQueryRequest,
    db: DatabaseDep,
) -> AuditAssistantQueryResponse:
    """Direct alias for AI assistant query."""
    if not payload.audit_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="audit_id is required for grounded AI assistant query.",
        )
    return await AuditAssistantService.answer_query(
        query=payload.query,
        audit_id=payload.audit_id,
        db=db,
    )


@router.post(
    "/risks/{risk_id}/explanation",
    response_model=RiskExplanationResponse,
    summary="Generate evidence-grounded technical explanation for a correlated risk",
)
async def explain_risk(
    risk_id: str,
    db: DatabaseDep,
) -> RiskExplanationResponse:
    """Generates an evidence-grounded advisory explanation for prioritized risk intelligence."""
    return await RiskExplanationService.explain_risk(risk_id=risk_id, db=db)


@router.post(
    "/remediations/{remediation_id}/explanation",
    response_model=RemediationExplanationResponse,
    summary="Generate evidence-grounded technical explanation for a verified remediation diff",
)
async def explain_remediation(
    remediation_id: str,
    db: DatabaseDep,
) -> RemediationExplanationResponse:
    """Generates an evidence-grounded advisory explanation for a static remediation proposal."""
    return await RemediationExplanationService.explain_remediation(remediation_id=remediation_id, db=db)


@router.post(
    "/briefing",
    response_model=AISecurityBriefingResponse,
    summary="Generate a comprehensive evidence-grounded AI Security Briefing",
)
async def generate_ai_security_briefing(
    payload: AISecurityBriefingRequest,
    db: DatabaseDep,
) -> AISecurityBriefingResponse:
    """
    Generates a structured, evidence-grounded AI Security Briefing for an audit session:
    - Synthesizes posture summary, top risks, attack surface, and security evolution deltas.
    - Grounded strictly in deterministic AST findings and verified configuration lines.
    - Zero ability to modify compliance scores or PASS/FAIL verdicts.
    """
    return await AISecurityBriefingService.generate_briefing(
        audit_id=payload.audit_id,
        baseline_audit_id=payload.baseline_audit_id,
        focus_area=payload.focus_area,
        db=db,
    )


@router.get(
    "/briefing/{audit_id}",
    response_model=AISecurityBriefingResponse,
    summary="Generate or retrieve an AI Security Briefing for an audit ID",
)
async def get_ai_security_briefing_by_audit(
    audit_id: str,
    baseline_audit_id: Optional[str] = None,
    db: DatabaseDep = None,
) -> AISecurityBriefingResponse:
    """Direct alias to generate AI Security Briefing for an audit ID."""
    return await AISecurityBriefingService.generate_briefing(
        audit_id=audit_id,
        baseline_audit_id=baseline_audit_id,
        db=db,
    )


@router.post(
    "/copilot",
    response_model=CopilotChatResponse,
    summary="Analyst Copilot natural-language Q&A with grounded AST evidence citations",
)
async def chat_analyst_copilot(
    payload: CopilotChatRequest,
    db: DatabaseDep,
) -> CopilotChatResponse:
    """
    Natural-language question answering for SOC security engineers:
    - Grounded strictly in active audit findings and configuration lines.
    - Formats citations as [EVIDENCE · LINE X] linking directly to AST proofs.
    - Strictly advisory; zero device write capability.
    """
    return await AISecurityBriefingService.chat_copilot(
        query=payload.query,
        audit_id=payload.audit_id,
        baseline_audit_id=payload.baseline_audit_id,
        chat_history=payload.chat_history,
        db=db,
    )



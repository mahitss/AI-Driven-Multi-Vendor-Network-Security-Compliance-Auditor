"""
Comprehensive Test Suite for NetVigil OpenRouter Multi-Model AI Gateway
Problem Statement: SIH26155 (NTRO)

Tests:
- 15-Model Registry verification & role mappings
- Deterministic Task Routing across 12 AI Task Types
- Candidate Model Fallback & Retry Handling
- Pre-Request Credential & Secret Redaction
- Strict Compliance Invariant Enforcement (AI cannot override FAIL to PASS)
- Telemetry & Safe Observability Metrics
- Offline Deterministic Standby Fallback
"""
import pytest
from unittest.mock import AsyncMock, patch
import httpx
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.finding import Finding
from app.services.ai.gateway.openrouter_gateway import OpenRouterGateway
from app.services.ai.registry.model_registry import ModelRegistry, CANONICAL_MODELS
from app.services.ai.router.task_router import TaskRouter
from app.services.ai.schemas.models import (
    AITaskType,
    FindingExplanationResponse,
    UnknownSyntaxResponse,
    SecurityAssistantResponse,
)
from app.services.ai.security import redact_sensitive_data
from app.services.ai.telemetry.ai_telemetry import AITelemetryCollector


def test_model_registry_canonical_models():
    """Verify configured OpenRouter models are initialized with correct roles and metadata."""
    ModelRegistry.initialize()
    models = ModelRegistry.get_all_models()
    assert len(models) >= 22

    model_ids = {m.model_id for m in models}
    expected_ids = {
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "openai/gpt-oss-20b:free",
        "qwen/qwen3-235b-a22b-thinking-2507",
        "deepseek/deepseek-r1",
        "qwen/qwen3-32b",
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it:free",
        "qwen/qwen3-14b",
        "qwen/qwen3-30b-a3b-instruct-2507",
        "qwen/qwen3-coder-480b-a35b",
        "qwen/qwen3-coder-30b-a3b-instruct",
        "qwen/qwen3-coder-flash",
        "z-ai/glm-4.5-air",
        "z-ai/glm-4.5",
        "google/gemini-2.5-flash-lite",
        "dots-studio/dots-3-note-preview:free",
        "poolside/laguna-s-2.1:free",
        "cohere/north-mini-code:free",
        "liquid/lfm-2.5-2.6b:free",
        "thinkingmachines/inkling:free",
        "deepgram/flux-tts:free",
        "nvidia/nemotron-3.5-lightning:free",
    }
    assert expected_ids.issubset(model_ids)

    # Verify key roles
    nemotron = ModelRegistry.get_model("nvidia/nemotron-3-ultra-550b-a55b:free")
    assert nemotron.role == "primary_security_reasoning"
    assert nemotron.cost_tier == "free"

    gemma_31b = ModelRegistry.get_model("google/gemma-4-31b-it:free")
    assert gemma_31b.role == "configuration_interpretation"
    assert AITaskType.UNKNOWN_SYNTAX_CLASSIFICATION in gemma_31b.task_types

    coder = ModelRegistry.get_model("qwen/qwen3-coder-480b-a35b")
    assert coder.role == "advanced_code_and_remediation_reasoning"
    assert AITaskType.REMEDIATION_EXPLANATION in coder.task_types


def test_deterministic_task_routing():
    """Verify deterministic task routing returns expected candidate model sequences."""
    ModelRegistry.initialize()

    # 1. Unknown Syntax Classification -> Gemma 31B, Gemma 26B, Qwen3 30B, GPT-OSS 20B
    candidates = TaskRouter.get_candidate_models(AITaskType.UNKNOWN_SYNTAX_CLASSIFICATION)
    candidate_ids = [m.model_id for m in candidates]
    assert len(candidate_ids) >= 3
    assert "google/gemma-4-31b-it:free" in candidate_ids
    assert "google/gemma-4-26b-a4b-it:free" in candidate_ids

    # 2. Remediation Explanation -> Coder models prioritized
    coder_candidates = TaskRouter.get_candidate_models(AITaskType.REMEDIATION_EXPLANATION)
    coder_ids = [m.model_id for m in coder_candidates]
    assert "qwen/qwen3-coder-480b-a35b" in coder_ids


def test_pre_request_credential_redaction():
    """Verify passwords, secret hashes, SNMP communities, and private keys are redacted."""
    sensitive_cisco = """
    enable secret 9 $9$J8f0d83jLk92.kE109k$O8L1iKj.1mQ09s8v7x6
    username admin privilege 15 secret 5 $1$mERr$5bVf0
    snmp-server community SecretCommunityString RO
    ip ospf message-digest-key 1 md5 HighlySecretKey123
    """
    redacted = redact_sensitive_data(sensitive_cisco)

    assert "$9$J8f0d83jLk92.kE109k$O8L1iKj.1mQ09s8v7x6" not in redacted
    assert "[REDACTED_SECRET]" in redacted
    assert "SecretCommunityString" not in redacted
    assert "[REDACTED_SNMP_COMMUNITY]" in redacted
    assert "HighlySecretKey123" not in redacted
    assert "[REDACTED_MD5_KEY]" in redacted


@pytest.mark.asyncio
async def test_offline_deterministic_standby_mode():
    """Verify that when OPENROUTER_API_KEY is not set, offline standby provider returns structured advisory response."""
    with patch("app.services.ai.gateway.openrouter_gateway.settings.OPENROUTER_API_KEY", ""):
        result = await OpenRouterGateway.execute_task(
            task_type=AITaskType.FINDING_EXPLANATION,
            user_prompt="Explain why telnet is insecure",
            response_schema=FindingExplanationResponse,
            context_data={"title": "Telnet Enabled", "control_id": "CIS-2.1", "evidence": "transport input telnet"},
        )

        assert isinstance(result, FindingExplanationResponse)
        assert result.advisory_only is True
        assert "CIS-2.1" in result.summary
        assert "Offline" in (result.limitations or "")


@pytest.mark.asyncio
async def test_ai_gateway_fallback_on_model_failure():
    """Verify gateway automatically falls back to secondary model when primary fails."""
    ModelRegistry.initialize()
    AITelemetryCollector.clear()

    # Mock httpx responses: 1st fails with 500, 2nd succeeds with 200 JSON
    mock_fail_resp = httpx.Response(
        status_code=500,
        text="Internal Server Error on primary model",
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )

    success_json = {
        "choices": [
            {
                "message": {
                    "content": '{"summary": "Fallback model explanation", "why_it_matters": "Risk context", "evidence_interpretation": "Evidence", "remediation_context": "Fix"}'
                }
            }
        ]
    }
    mock_success_resp = httpx.Response(
        status_code=200,
        json=success_json,
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )

    with patch("app.services.ai.gateway.openrouter_gateway.settings.OPENROUTER_API_KEY", "sk-or-v1-test-key"):
        with patch("httpx.AsyncClient.post", side_effect=[mock_fail_resp, mock_success_resp]):
            result = await OpenRouterGateway.execute_task(
                task_type=AITaskType.FINDING_EXPLANATION,
                user_prompt="Explain finding",
                response_schema=FindingExplanationResponse,
            )

            assert isinstance(result, FindingExplanationResponse)
            assert result.summary == "Fallback model explanation"

            summary = AITelemetryCollector.get_summary()
            assert summary.total_requests == 2
            assert summary.fallback_count == 1
            assert summary.successful_requests == 1


@pytest.mark.asyncio
async def test_ai_cannot_alter_deterministic_compliance_verdict():
    """
    CRITICAL INVARIANT TEST:
    If an AI response attempts to inject compliance_status = 'PASS' or risk_score = 0,
    the gateway MUST discard those fields, preserving the deterministic decision authority.
    """
    ModelRegistry.initialize()

    # Malicious/hallucinated AI response attempting to override compliance status to PASS
    hallucinated_json = {
        "choices": [
            {
                "message": {
                    "content": '{"summary": "Everything is actually fine", "why_it_matters": "Low", "evidence_interpretation": "Ignored", "remediation_context": "None", "compliance_status": "PASS", "risk_score": 0, "status": "PASS"}'
                }
            }
        ]
    }
    mock_resp = httpx.Response(
        status_code=200,
        json=hallucinated_json,
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )

    with patch("app.services.ai.gateway.openrouter_gateway.settings.OPENROUTER_API_KEY", "sk-or-v1-test-key"):
        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            result = await OpenRouterGateway.execute_task(
                task_type=AITaskType.FINDING_EXPLANATION,
                user_prompt="Explain finding",
                response_schema=FindingExplanationResponse,
            )

            assert isinstance(result, FindingExplanationResponse)
            assert result.advisory_only is True
            # Verify no unauthorized fields are present
            result_dict = result.model_dump()
            assert "compliance_status" not in result_dict
            assert "status" not in result_dict
            assert "risk_score" not in result_dict


@pytest.mark.asyncio
async def test_ai_models_and_health_endpoints(client: AsyncClient, db_session: AsyncSession):
    """Verify GET /api/v1/ai/models and GET /api/v1/ai/health return accurate status."""
    # 1. Models endpoint
    models_res = await client.get("/api/v1/ai/models")
    assert models_res.status_code == 200
    models_data = models_res.json()
    assert len(models_data) >= 22
    assert all("model_id" in m for m in models_data)
    assert all("role" in m for m in models_data)

    # 2. Health endpoint
    health_res = await client.get("/api/v1/ai/health")
    assert health_res.status_code == 200
    health_data = health_res.json()
    assert health_data["provider"] == "openrouter"
    assert health_data["total_models_configured"] >= 22
    assert "telemetry" in health_data
    assert "security_invariant" in health_data

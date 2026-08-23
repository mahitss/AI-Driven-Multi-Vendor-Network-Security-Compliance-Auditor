"""
NetVigil Central OpenRouter Multi-Model AI Gateway
Problem Statement: SIH26155 (NTRO)

Features:
- Deterministic task routing across 15 specialized models
- Automatic fallback up to 3 candidate models per request
- Pre-request credential redaction
- Structured JSON output parsing with Pydantic validation
- Strict enforcement that AI output NEVER alters deterministic compliance verdicts
- Non-blocking offline fallback when unconfigured or unreachable
- Safe operational telemetry collection
"""
import json
import re
import time
from typing import Any, Dict, List, Optional, Type, TypeVar
import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.core.logging import logger
from app.services.ai.fallback.offline_provider import OfflineStandbyProvider
from app.services.ai.prompts.system_prompts import get_system_prompt_for_task
from app.services.ai.registry.model_registry import ModelInfo, ModelRegistry
from app.services.ai.router.task_router import TaskRouter
from app.services.ai.schemas.models import (
    AITaskType,
    FORBIDDEN_COMPLIANCE_FIELDS,
    BaseAdvisoryResponse,
)
from app.services.ai.security import redact_sensitive_data
from app.services.ai.telemetry.ai_telemetry import AITelemetryCollector

T = TypeVar("T", bound=BaseModel)


class OpenRouterGateway:
    """Central gateway orchestrating OpenRouter model requests, fallbacks, and telemetry."""

    @classmethod
    def _extract_json(cls, raw_text: str) -> str:
        """Extracts JSON substring from markdown code fences or surrounding text."""
        raw = raw_text.strip()
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw, re.DOTALL)
        if match:
            return match.group(1).strip()
        # Fallback to finding outermost { ... }
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            return raw[start : end + 1]
        return raw

    @classmethod
    def _sanitize_dict_against_compliance_overrides(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Strips any attempt by an LLM to override deterministic compliance scores or statuses."""
        cleaned = {}
        for k, v in data.items():
            if k.lower() in FORBIDDEN_COMPLIANCE_FIELDS:
                logger.warning(f"Discarded unauthorized compliance override field from AI response: {k}={v}")
                continue
            cleaned[k] = v
        cleaned["advisory_only"] = True
        return cleaned

    @classmethod
    async def execute_task(
        cls,
        task_type: AITaskType,
        user_prompt: str,
        response_schema: Optional[Type[T]] = None,
        context_data: Optional[Dict[str, Any]] = None,
        preferred_model: Optional[str] = None,
        max_attempts: int = 3,
    ) -> Any:
        """
        Executes an AI task through OpenRouter with automatic candidate fallback,
        strict redaction, schema validation, and offline recovery.
        """
        api_key = settings.OPENROUTER_API_KEY.strip() if settings.OPENROUTER_API_KEY else ""

        # If no API key configured, use offline deterministic standby provider immediately
        if not api_key:
            logger.info("OPENROUTER_API_KEY not configured. Executing offline deterministic standby provider.")
            return await OfflineStandbyProvider.generate_fallback_response(
                task_type=task_type,
                user_prompt=user_prompt,
                response_schema=response_schema,
                context_data=context_data,
            )

        # 1. Pre-Request Redaction
        sanitized_user_prompt = redact_sensitive_data(user_prompt)
        system_prompt = get_system_prompt_for_task(task_type)

        # Append schema schema instruction if specified
        if response_schema:
            try:
                schema_json = json.dumps(response_schema.model_json_schema().get("properties", {}), indent=2)
                system_prompt += f"\nRequired JSON Structure:\n{schema_json}"
            except Exception:
                pass

        # 2. Determine Candidate Model Sequence
        candidates: List[ModelInfo] = TaskRouter.get_candidate_models(task_type)

        if preferred_model:
            pref = ModelRegistry.get_model(preferred_model)
            if pref:
                candidates = [pref] + [c for c in candidates if c.model_id != preferred_model]

        if not candidates:
            # Fallback to default canonical
            candidates = [
                ModelInfo(
                    model_id="nvidia/nemotron-3-ultra-550b-a55b:free",
                    role="primary_security_reasoning",
                    task_types=[task_type],
                )
            ]

        # 3. Model Fallback Execution Loop (Max 3 attempts)
        attempts = 0
        last_error = None
        base_url = settings.OPENROUTER_BASE_URL.rstrip("/")

        for model in candidates[:max_attempts]:
            attempts += 1
            start_time = time.perf_counter()
            fallback_used = attempts > 1

            headers = {
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "https://netvigil.ntro.gov.in",
                "X-Title": "NetVigil Network Security Compliance Auditor",
                "Content-Type": "application/json",
            }

            payload: Dict[str, Any] = {
                "model": model.model_id,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": sanitized_user_prompt},
                ],
                "temperature": model.temperature,
                "max_tokens": model.max_tokens,
            }

            try:
                logger.info(f"AI Gateway Dispatch [Attempt {attempts}/{max_attempts}]: Task={task_type.value}, Model={model.model_id}")

                async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
                    resp = await client.post(
                        f"{base_url}/chat/completions",
                        headers=headers,
                        json=payload,
                    )

                latency_ms = (time.perf_counter() - start_time) * 1000

                if resp.status_code != 200:
                    err_body = resp.text[:300]
                    raise RuntimeError(f"OpenRouter HTTP {resp.status_code}: {err_body}")

                data = resp.json()
                raw_content = data["choices"][0]["message"]["content"] or "{}"

                # 4. JSON & Schema Extraction
                parsed_json = json.loads(cls._extract_json(raw_content))
                cleaned_data = cls._sanitize_dict_against_compliance_overrides(parsed_json)

                # Validate against target schema
                if response_schema:
                    validated_response = response_schema.model_validate(cleaned_data)
                else:
                    validated_response = cleaned_data

                # Record Success in Registry and Telemetry
                ModelRegistry.record_success(model.model_id, latency_ms)
                AITelemetryCollector.record(
                    task_type=task_type,
                    model=model.model_id,
                    latency_ms=latency_ms,
                    attempt=attempts,
                    fallback_used=fallback_used,
                    success=True,
                    schema_valid=True,
                )

                return validated_response

            except Exception as e:
                latency_ms = (time.perf_counter() - start_time) * 1000
                err_msg = str(e)
                logger.warning(
                    f"AI Gateway Model Attempt Failed [{model.model_id}]: {err_msg}. Triggering fallback sequence."
                )

                ModelRegistry.record_failure(model.model_id, err_msg)
                AITelemetryCollector.record(
                    task_type=task_type,
                    model=model.model_id,
                    latency_ms=latency_ms,
                    attempt=attempts,
                    fallback_used=fallback_used,
                    success=False,
                    schema_valid=False,
                    error_type=type(e).__name__,
                )
                last_error = e

        # If all candidate attempts failed: execute offline deterministic fallback
        logger.error(
            f"All {attempts} AI candidate models failed for task {task_type.value}. Last error: {last_error}. Invoking offline standby provider."
        )
        return await OfflineStandbyProvider.generate_fallback_response(
            task_type=task_type,
            user_prompt=user_prompt,
            response_schema=response_schema,
            context_data=context_data,
        )

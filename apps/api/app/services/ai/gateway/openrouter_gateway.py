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
import asyncio
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
        """Strips any attempt by an LLM to override deterministic compliance scores or statuses and normalizes nested dicts and types."""
        cleaned = {}
        for k, v in data.items():
            if k.lower() in FORBIDDEN_COMPLIANCE_FIELDS:
                logger.warning(f"Discarded unauthorized compliance override field from AI response: {k}={v}")
                continue
            if isinstance(v, dict):
                # If model echoed schema metadata like {'description': '...'}
                if "description" in v and isinstance(v["description"], str):
                    v = v["description"]
                elif "value" in v and isinstance(v["value"], str):
                    v = v["value"]
                elif "text" in v and isinstance(v["text"], str):
                    v = v["text"]
            cleaned[k] = v

        # Confidence normalization (convert string like "High" or "95%" to float)
        if "confidence" in cleaned:
            val = cleaned["confidence"]
            if isinstance(val, str):
                numbers = re.findall(r"\d+(?:\.\d+)?", val)
                if numbers:
                    num = float(numbers[0])
                    cleaned["confidence"] = num / 100.0 if num > 1.0 else num
                else:
                    cleaned["confidence"] = 0.90
            elif isinstance(val, (int, float)):
                cleaned["confidence"] = float(val) / 100.0 if val > 1.0 else float(val)

        # Compliance score normalization (convert string like "53.3%" or "53.3" to float)
        if "compliance_score" in cleaned:
            val = cleaned["compliance_score"]
            if isinstance(val, str):
                numbers = re.findall(r"\d+(?:\.\d+)?", val)
                cleaned["compliance_score"] = float(numbers[0]) if numbers else 0.0
            elif isinstance(val, (int, float)):
                cleaned["compliance_score"] = float(val)

        # Evidence list normalization
        if "evidence_used" in cleaned and isinstance(cleaned["evidence_used"], str):
            cleaned["evidence_used"] = [cleaned["evidence_used"]]

        # Source lines normalization
        if "source_lines" in cleaned:
            sl = cleaned["source_lines"]
            if isinstance(sl, str):
                cleaned["source_lines"] = [int(x) for x in re.findall(r"\b\d+\b", sl)]
            elif isinstance(sl, list):
                extracted_lines = []
                for item in sl:
                    if isinstance(item, int):
                        extracted_lines.append(item)
                    elif isinstance(item, str):
                        nums = re.findall(r"\b\d+\b", item)
                        extracted_lines.extend(int(n) for n in nums)
                cleaned["source_lines"] = extracted_lines

        # Suggested followups / copilot questions normalization
        if "suggested_copilot_questions" in cleaned and isinstance(cleaned["suggested_copilot_questions"], str):
            cleaned["suggested_copilot_questions"] = [
                q.strip().lstrip("0123456789.-* ")
                for q in cleaned["suggested_copilot_questions"].split("\n")
                if q.strip()
            ]
        if "suggested_followups" in cleaned and isinstance(cleaned["suggested_followups"], str):
            cleaned["suggested_followups"] = [
                q.strip().lstrip("0123456789.-* ")
                for q in cleaned["suggested_followups"].split("\n")
                if q.strip()
            ]

        # Top risks list normalization (must be list of dicts, discard if string)
        if "top_risks" in cleaned and not isinstance(cleaned["top_risks"], list):
            cleaned["top_risks"] = []

        # Recommended investigation order normalization
        if "recommended_investigation_order" in cleaned and not isinstance(cleaned["recommended_investigation_order"], list):
            cleaned["recommended_investigation_order"] = []

        # Security evolution normalization (must be dict, discard if string narrative)
        if "security_evolution" in cleaned and not isinstance(cleaned["security_evolution"], dict):
            cleaned["security_evolution"] = None

        # Grounded evidence citations normalization
        if "grounded_evidence_citations" in cleaned and not isinstance(cleaned["grounded_evidence_citations"], list):
            cleaned["grounded_evidence_citations"] = []
        if "grounded_evidence" in cleaned and not isinstance(cleaned["grounded_evidence"], list):
            cleaned["grounded_evidence"] = []

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
    ) -> T:
        """
        Executes an AI task through OpenRouter multi-model router with automatic fallback,
        strict prompt-injection defense, and compliance isolation.
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

        # Append clean example JSON instruction if specified
        if response_schema:
            try:
                props = response_schema.model_json_schema().get("properties", {})
                clean_example = {k: f"<{v.get('description', k)}>" for k, v in props.items()}
                system_prompt += f"\nYou MUST respond with ONLY a valid JSON object matching this structure (all field values must be strings, not objects):\n{json.dumps(clean_example, indent=2)}"
            except (AttributeError, TypeError, ValueError) as err:
                logger.debug("Could not generate JSON schema example for task %s: %s", task_type, err)
            except Exception as err:
                logger.warning("Unexpected error generating JSON schema example: %s", err)

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

                attempt_timeout = httpx.Timeout(5.0, connect=2.5, read=5.0, write=2.5, pool=2.5)
                async with httpx.AsyncClient(timeout=attempt_timeout) as client:
                    resp = await asyncio.wait_for(
                        client.post(
                            f"{base_url}/chat/completions",
                            headers=headers,
                            json=payload,
                        ),
                        timeout=5.0,
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

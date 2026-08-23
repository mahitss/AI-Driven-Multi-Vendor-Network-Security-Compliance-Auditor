"""
NetVigil OpenRouter Low-Level HTTP Client
Problem Statement: SIH26155 (NTRO)

Strict Security Invariant:
OpenRouter is the SOLE external AI provider.
Direct integrations with OpenAI, Anthropic, Cohere, or Gemini APIs are prohibited.
"""
from typing import Any, Dict, List, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger


class OpenRouterClient:
    """Async client communicating strictly with the OpenRouter API."""

    @classmethod
    def is_configured(cls) -> bool:
        """Returns True if OPENROUTER_API_KEY is present and non-empty."""
        return bool(settings.OPENROUTER_API_KEY and settings.OPENROUTER_API_KEY.strip())

    @classmethod
    async def chat_completion(
        cls,
        model_id: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.0,
        max_tokens: int = 2000,
        timeout_seconds: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches a chat completion request to OpenRouter.
        Raises descriptive runtime exceptions for timeouts, 429 rate limits, 5xx errors.
        """
        api_key = settings.OPENROUTER_API_KEY.strip() if settings.OPENROUTER_API_KEY else ""
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not configured.")

        base_url = settings.OPENROUTER_BASE_URL.rstrip("/")
        timeout = timeout_seconds or settings.AI_TIMEOUT_SECONDS

        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://netvigil.ntro.gov.in",
            "X-Title": "NetVigil Network Security Compliance Auditor",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=payload,
            )

        if resp.status_code == 429:
            raise RuntimeError(f"OpenRouter Rate Limit Exceeded (429) for model {model_id}")
        elif resp.status_code >= 500:
            raise RuntimeError(f"OpenRouter Server Error ({resp.status_code}) for model {model_id}: {resp.text[:200]}")
        elif resp.status_code != 200:
            raise RuntimeError(f"OpenRouter HTTP {resp.status_code} ({model_id}): {resp.text[:300]}")

        return resp.json()

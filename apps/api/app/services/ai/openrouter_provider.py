"""
OpenRouter AI Provider Implementation
Problem Statement: SIH26155 (NTRO)

Features:
- Configurable model endpoint via OpenRouter
- Structured JSON output parsing and Pydantic validation
- Error handling with clean fallback to MockAIProvider when unconfigured
"""
import json
import re
from typing import Any, Dict, Optional, Type, TypeVar
import httpx
from pydantic import BaseModel, ValidationError
from app.core.config import settings
from app.core.logging import logger
from app.services.ai.base_provider import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider

T = TypeVar("T", bound=BaseModel)


class OpenRouterProvider(BaseAIProvider):
    """Production AI Provider integrating with OpenRouter API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.base_url = (base_url or settings.OPENROUTER_BASE_URL).rstrip("/")
        self.model = model or settings.AI_MODEL
        self._fallback_provider = MockAIProvider()

    def _extract_json_block(self, text: str) -> str:
        """Extracts JSON payload from potential markdown code blocks (```json ... ```)."""
        text = text.strip()
        # Look for ```json ... ``` or ``` ... ```
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.DOTALL)
        if match:
            return match.group(1).strip()
        return text

    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        if not self.api_key:
            logger.info("OPENROUTER_API_KEY not configured; using deterministic mock provider.")
            return await self._fallback_provider.generate_text(system_prompt, user_prompt)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://netvigil.ntro.gov.in",
            "X-Title": "NetVigil Network Security Compliance Auditor",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature if temperature is not None else settings.AI_TEMPERATURE,
            "max_tokens": max_tokens or settings.AI_MAX_TOKENS,
        }

        try:
            async with httpx.AsyncClient(timeout=float(settings.AI_TIMEOUT_SECONDS)) as client:
                resp = await client.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.warning(f"OpenRouter API returned HTTP {resp.status_code}: {resp.text}")
                    return await self._fallback_provider.generate_text(system_prompt, user_prompt)
        except Exception as e:
            logger.error(f"OpenRouter connection failed: {e}; falling back to mock.")
            return await self._fallback_provider.generate_text(system_prompt, user_prompt)

    async def generate_structured(
        self,
        schema: Type[T],
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> T:
        if not self.api_key:
            return await self._fallback_provider.generate_structured(schema, system_prompt, user_prompt)

        raw_text = await self.generate_text(system_prompt, user_prompt, temperature, max_tokens)
        json_str = self._extract_json_block(raw_text)

        try:
            parsed = json.loads(json_str)
            return schema.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as err:
            logger.warning(f"AI response failed schema validation: {err}. Falling back to mock generator.")
            return await self._fallback_provider.generate_structured(schema, system_prompt, user_prompt)

    async def check_health(self) -> Dict[str, Any]:
        return {
            "provider": "openrouter",
            "model": self.model,
            "status": "configured" if self.api_key else "offline_fallback",
            "has_api_key": bool(self.api_key),
            "temperature": settings.AI_TEMPERATURE,
            "timeout_seconds": settings.AI_TIMEOUT_SECONDS,
        }

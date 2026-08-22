"""
NetVigil AI Provider Abstraction Interface
Problem Statement: SIH26155 (NTRO)

CRITICAL ARCHITECTURAL BOUNDARY:
- The LLM is NEVER the compliance engine.
- Deterministic parsers and rules generate canonical audits and findings.
- This AI abstraction is strictly for:
    1. Human-in-the-loop explanation of findings
    2. Suggesting syntax explanations for obscure/unparsed vendor commands
    3. Suggesting remediation steps (which are validated against safety policies)
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import httpx
from pydantic import BaseModel, Field
from app.core.config import settings
from app.core.logging import logger


class AISuggestion(BaseModel):
    summary: str
    explanation: str
    suggested_remediation: Optional[str] = None
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)
    structured_data: Dict[str, Any] = Field(default_factory=dict)
    disclaimer: str = Field(
        default="AI-generated assistance. Must be validated by network security administrator before deployment."
    )


class BaseAIProvider(ABC):
    """Abstract interface for multi-vendor AI explanation and interpretation providers."""

    @abstractmethod
    async def generate_explanation(
        self,
        finding_title: str,
        vendor: str,
        evidence_snippet: str,
        expected_policy: str,
    ) -> AISuggestion:
        """Generate structured human-readable explanation and remediation guidance."""
        pass

    @abstractmethod
    async def interpret_unknown_syntax(
        self,
        vendor_hint: str,
        raw_syntax: str,
    ) -> AISuggestion:
        """Analyze an obscure CLI statement to assist adaptive rule mapping."""
        pass


class OpenRouterAIProvider(BaseAIProvider):
    """OpenRouter-compatible LLM provider with fallback handling."""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.base_url = (base_url or settings.OPENROUTER_BASE_URL).rstrip("/")
        self.model = model or settings.AI_MODEL

    async def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        if not self.api_key:
            return (
                "AI provider API key not configured. Enable OPENROUTER_API_KEY in .env "
                "to activate real-time LLM explanation co-pilot."
            )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://github.com/netvigil",
            "X-Title": "NetVigil Network Compliance Auditor",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": settings.AI_TEMPERATURE,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.warning(f"OpenRouter API returned HTTP {response.status_code}: {response.text}")
                    return f"AI provider returned status {response.status_code}."
        except Exception as e:
            logger.error(f"Error communicating with AI Provider: {e}")
            return "AI service is temporarily unreachable."

    async def generate_explanation(
        self,
        finding_title: str,
        vendor: str,
        evidence_snippet: str,
        expected_policy: str,
    ) -> AISuggestion:
        system_prompt = (
            "You are NetVigil AI Co-pilot, a specialized network security assistant. "
            "Explain compliance findings clearly and provide vendor-specific remediation syntax. "
            "Be precise, concise, and security-focused."
        )
        user_prompt = (
            f"Finding: {finding_title}\n"
            f"Vendor: {vendor}\n"
            f"Observed Evidence: {evidence_snippet}\n"
            f"Expected Policy: {expected_policy}\n\n"
            f"Provide: (1) Technical Risk Explanation, (2) Step-by-step CLI Remediation."
        )
        content = await self._call_llm(system_prompt, user_prompt)
        return AISuggestion(
            summary=f"Analysis of {finding_title} on {vendor.upper()}",
            explanation=content,
            confidence=0.85,
        )

    async def interpret_unknown_syntax(
        self,
        vendor_hint: str,
        raw_syntax: str,
    ) -> AISuggestion:
        system_prompt = (
            "You are NetVigil Syntax Analyzer. Interpret the security intent of unknown or unparsed network device syntax."
        )
        user_prompt = f"Vendor Hint: {vendor_hint}\nSyntax:\n{raw_syntax}\n\nExplain security domain and intent."
        content = await self._call_llm(system_prompt, user_prompt)
        return AISuggestion(
            summary=f"Interpretation for {vendor_hint} syntax",
            explanation=content,
            confidence=0.75,
        )


class MockAIProvider(BaseAIProvider):
    """Deterministic Mock AI provider for offline testing and air-gapped environments."""

    async def generate_explanation(
        self,
        finding_title: str,
        vendor: str,
        evidence_snippet: str,
        expected_policy: str,
    ) -> AISuggestion:
        return AISuggestion(
            summary=f"[Deterministic Baseline] Explanation for {finding_title}",
            explanation=(
                f"On {vendor.title()} devices, {finding_title} violates standard security baseline.\n"
                f"Evidence: {evidence_snippet}\n"
                f"Requirement: {expected_policy}"
            ),
            suggested_remediation=f"# Apply baseline configuration for {vendor}\n# Review company security standard.",
            confidence=1.0,
        )

    async def interpret_unknown_syntax(
        self,
        vendor_hint: str,
        raw_syntax: str,
    ) -> AISuggestion:
        return AISuggestion(
            summary=f"[Deterministic Baseline] Syntax interpretation for {vendor_hint}",
            explanation=f"Command '{raw_syntax.strip()}' relates to device control and access settings.",
            confidence=1.0,
        )


def get_ai_provider() -> BaseAIProvider:
    """Factory helper returning appropriate AI provider implementation."""
    if settings.OPENROUTER_API_KEY:
        return OpenRouterAIProvider()
    return MockAIProvider()

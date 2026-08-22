"""
AI Provider Factory & Manager
Problem Statement: SIH26155 (NTRO)
"""
from app.core.config import settings
from app.services.ai.base_provider import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.openrouter_provider import OpenRouterProvider


def get_ai_provider() -> BaseAIProvider:
    """Returns the configured AI Provider instance."""
    provider_type = (settings.AI_PROVIDER or "openrouter").lower().strip()

    if provider_type == "mock":
        return MockAIProvider()
    elif provider_type == "openrouter":
        return OpenRouterProvider()
    else:
        return OpenRouterProvider()

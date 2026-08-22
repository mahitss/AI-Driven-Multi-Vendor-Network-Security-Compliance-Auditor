"""
AI Provider Abstraction Unit Tests
Problem Statement: SIH26155 (NTRO)
"""
import pytest
from pydantic import BaseModel
from app.schemas.ai import FindingExplanationResponse
from app.services.ai.manager import get_ai_provider
from app.services.ai.mock_provider import MockAIProvider


class DummySchema(BaseModel):
    name: str = "test"
    valid: bool = True


@pytest.mark.asyncio
async def test_mock_ai_provider_text_and_structured():
    provider = MockAIProvider()

    # Test text generation
    text = await provider.generate_text(
        system_prompt="Test System",
        user_prompt="Explain finding",
    )
    assert len(text) > 0

    # Test structured generation
    res = await provider.generate_structured(
        schema=FindingExplanationResponse,
        system_prompt="System Prompt",
        user_prompt="User Prompt",
    )
    assert isinstance(res, FindingExplanationResponse)
    assert res.confidence >= 0.80
    assert len(res.summary) > 0
    assert len(res.recommended_action) > 0


@pytest.mark.asyncio
async def test_ai_provider_manager_factory():
    provider = get_ai_provider()
    assert provider is not None
    health = await provider.check_health()
    assert "status" in health
    assert "provider" in health

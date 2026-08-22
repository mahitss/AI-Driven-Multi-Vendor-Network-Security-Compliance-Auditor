"""
NetVigil Base AI Provider Interface
Problem Statement: SIH26155 (NTRO)

Strict Architectural Rule:
- The AI layer explains, assists, and interprets.
- The deterministic compliance engine remains the sole source of truth.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Type, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class BaseAIProvider(ABC):
    """Abstract interface for all AI model providers (OpenRouter, Mock, Local)."""

    @abstractmethod
    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generate raw text response from the model."""
        pass

    @abstractmethod
    async def generate_structured(
        self,
        schema: Type[T],
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> T:
        """
        Generate a structured response validated strictly against a Pydantic schema.
        Raises ValueError or ValidationError if output is invalid.
        """
        pass

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """Check provider connectivity and configuration status."""
        pass

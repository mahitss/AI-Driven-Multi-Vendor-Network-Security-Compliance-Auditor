"""AI Prompts Package."""
from app.services.ai.prompts.system_prompts import (
    BASE_ADVISORY_INSTRUCTION,
    get_system_prompt_for_task,
)

__all__ = ["BASE_ADVISORY_INSTRUCTION", "get_system_prompt_for_task"]

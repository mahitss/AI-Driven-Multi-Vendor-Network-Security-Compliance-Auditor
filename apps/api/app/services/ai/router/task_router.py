"""
NetVigil Deterministic Task Router
Problem Statement: SIH26155 (NTRO)

Routes distinct AI tasks to an ordered priority list of specialized models.
Never uses random selection.
"""
from typing import List
from app.core.logging import logger
from app.services.ai.registry.model_registry import ModelInfo, ModelRegistry
from app.services.ai.schemas.models import AITaskType


class TaskRouter:
    """Determines model candidate sequence for a given AI task type."""

    @classmethod
    def get_candidate_models(cls, task_type: AITaskType) -> List[ModelInfo]:
        """
        Returns ordered candidate model sequence for the requested task.
        Filters out temporarily unavailable models unless all are unavailable.
        """
        candidates = ModelRegistry.get_models_for_task(task_type, only_available=True)

        if not candidates:
            logger.warning(
                f"All specialized models for {task_type.value} marked unavailable. Attempting recovery with all configured models."
            )
            candidates = ModelRegistry.get_models_for_task(task_type, only_available=False)

        # Ultimate fallback to any available fast reasoning model if still empty
        if not candidates:
            logger.warning(f"No specific models found for {task_type.value}; falling back to general reasoning models.")
            candidates = ModelRegistry.get_models_for_task(AITaskType.SECURITY_ASSISTANT, only_available=False)

        return candidates

"""
NetVigil Centralized OpenRouter Model Registry
Problem Statement: SIH26155 (NTRO)

Central repository of configured OpenRouter models, capabilities, priorities, and health state.
Models are never hardcoded throughout the application codebase.
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from app.services.ai.schemas.models import AITaskType


class ModelInfo(BaseModel):
    """Metadata specification and real-time operational state for a model."""
    model_id: str
    provider: str = "openrouter"
    role: str
    task_types: List[AITaskType]
    priority: int = Field(default=1, description="Primary priority within designated task (1 = highest)")
    fallback_priority: int = Field(default=2, description="Fallback priority order")
    context_length: int = 128000
    supports_structured_output: bool = True
    supports_tools: bool = True
    temperature: float = 0.0
    max_tokens: int = 2000
    enabled: bool = True
    available: bool = True
    cost_tier: str = "free"  # "free", "low", "medium", "high"
    reasoning_capability: str = "standard"  # "fast", "standard", "deep", "thinking", "coder"
    last_success: Optional[datetime] = None
    last_failure: Optional[datetime] = None
    last_latency_ms: Optional[float] = None
    failure_count: int = 0


# Exact 15 Canonical OpenRouter Models configured for NetVigil
CANONICAL_MODELS: List[ModelInfo] = [
    # 1. Primary Security Reasoning
    ModelInfo(
        model_id="nvidia/nemotron-3-ultra-550b-a55b:free",
        role="primary_security_reasoning",
        task_types=[
            AITaskType.FINDING_EXPLANATION,
            AITaskType.SECURITY_ASSISTANT,
            AITaskType.RISK_CONTEXT_EXPLANATION,
            AITaskType.AUDIT_SUMMARY,
        ],
        priority=1,
        fallback_priority=2,
        context_length=131072,
        cost_tier="free",
        reasoning_capability="deep",
        temperature=0.0,
        max_tokens=2048,
    ),

    # 2. Fast Reasoning
    ModelInfo(
        model_id="openai/gpt-oss-20b:free",
        role="fast_reasoning",
        task_types=[
            AITaskType.SECURITY_ASSISTANT,
            AITaskType.UNKNOWN_SYNTAX_CLASSIFICATION,
            AITaskType.DEVICE_SUMMARY,
            AITaskType.FRAMEWORK_EXPLANATION,
        ],
        priority=2,
        fallback_priority=3,
        context_length=65536,
        cost_tier="free",
        reasoning_capability="fast",
        temperature=0.1,
        max_tokens=1500,
    ),

    # 3. Deep Security Reasoning
    ModelInfo(
        model_id="qwen/qwen3-235b-a22b-thinking-2507",
        role="deep_security_reasoning",
        task_types=[
            AITaskType.FINDING_EXPLANATION,
            AITaskType.RISK_CONTEXT_EXPLANATION,
            AITaskType.SECURITY_ASSISTANT,
            AITaskType.AUDIT_SUMMARY,
        ],
        priority=1,
        fallback_priority=1,
        context_length=131072,
        cost_tier="medium",
        reasoning_capability="thinking",
        temperature=0.0,
        max_tokens=2500,
    ),

    # 4. Deep Reasoning
    ModelInfo(
        model_id="deepseek/deepseek-r1",
        role="deep_reasoning",
        task_types=[
            AITaskType.RISK_CONTEXT_EXPLANATION,
            AITaskType.FINDING_EXPLANATION,
            AITaskType.SECURITY_ASSISTANT,
        ],
        priority=2,
        fallback_priority=2,
        context_length=65536,
        cost_tier="medium",
        reasoning_capability="deep",
        temperature=0.0,
        max_tokens=2048,
    ),

    # 5. General Security Analysis
    ModelInfo(
        model_id="qwen/qwen3-32b",
        role="general_security_analysis",
        task_types=[
            AITaskType.CONFIGURATION_EXPLANATION,
            AITaskType.FRAMEWORK_EXPLANATION,
            AITaskType.FINDING_EXPLANATION,
            AITaskType.AUDIT_SUMMARY,
        ],
        priority=2,
        fallback_priority=2,
        context_length=131072,
        cost_tier="low",
        reasoning_capability="standard",
        temperature=0.1,
        max_tokens=1500,
    ),

    # 6. Configuration Interpretation
    ModelInfo(
        model_id="google/gemma-4-31b-it:free",
        role="configuration_interpretation",
        task_types=[
            AITaskType.CONFIGURATION_EXPLANATION,
            AITaskType.UNKNOWN_SYNTAX_CLASSIFICATION,
            AITaskType.DEVICE_SUMMARY,
        ],
        priority=1,
        fallback_priority=1,
        context_length=131072,
        cost_tier="free",
        reasoning_capability="standard",
        temperature=0.0,
        max_tokens=1500,
    ),

    # 7. Fast Configuration Classification
    ModelInfo(
        model_id="google/gemma-4-26b-a4b-it:free",
        role="fast_configuration_classification",
        task_types=[
            AITaskType.UNKNOWN_SYNTAX_CLASSIFICATION,
            AITaskType.CONFIGURATION_EXPLANATION,
        ],
        priority=2,
        fallback_priority=2,
        context_length=65536,
        cost_tier="free",
        reasoning_capability="fast",
        temperature=0.0,
        max_tokens=1024,
    ),

    # 8. Lightweight Syntax Analysis
    ModelInfo(
        model_id="qwen/qwen3-14b",
        role="lightweight_syntax_analysis",
        task_types=[
            AITaskType.UNKNOWN_SYNTAX_CLASSIFICATION,
            AITaskType.CONFIGURATION_EXPLANATION,
        ],
        priority=3,
        fallback_priority=3,
        context_length=32768,
        cost_tier="low",
        reasoning_capability="fast",
        temperature=0.0,
        max_tokens=1024,
    ),

    # 9. Structured Classification
    ModelInfo(
        model_id="qwen/qwen3-30b-a3b-instruct-2507",
        role="structured_classification",
        task_types=[
            AITaskType.UNKNOWN_SYNTAX_CLASSIFICATION,
            AITaskType.CONFIGURATION_EXPLANATION,
            AITaskType.CLI_SYNTAX_ASSISTANCE,
        ],
        priority=1,
        fallback_priority=2,
        context_length=131072,
        cost_tier="low",
        reasoning_capability="standard",
        temperature=0.0,
        max_tokens=1500,
    ),

    # 10. Advanced Code and Remediation Reasoning
    ModelInfo(
        model_id="qwen/qwen3-coder-480b-a35b",
        role="advanced_code_and_remediation_reasoning",
        task_types=[
            AITaskType.REMEDIATION_EXPLANATION,
            AITaskType.CODE_REVIEW,
            AITaskType.CLI_SYNTAX_ASSISTANCE,
        ],
        priority=1,
        fallback_priority=1,
        context_length=131072,
        cost_tier="high",
        reasoning_capability="coder",
        temperature=0.0,
        max_tokens=2500,
    ),

    # 11. CLI Generation and Code
    ModelInfo(
        model_id="qwen/qwen3-coder-30b-a3b-instruct",
        role="cli_generation_and_code",
        task_types=[
            AITaskType.REMEDIATION_EXPLANATION,
            AITaskType.CLI_SYNTAX_ASSISTANCE,
            AITaskType.CODE_REVIEW,
        ],
        priority=2,
        fallback_priority=2,
        context_length=131072,
        cost_tier="low",
        reasoning_capability="coder",
        temperature=0.0,
        max_tokens=2000,
    ),

    # 12. Fast Code Tasks
    ModelInfo(
        model_id="qwen/qwen3-coder-flash",
        role="fast_code_tasks",
        task_types=[
            AITaskType.CLI_SYNTAX_ASSISTANCE,
            AITaskType.REMEDIATION_EXPLANATION,
        ],
        priority=3,
        fallback_priority=3,
        context_length=65536,
        cost_tier="low",
        reasoning_capability="fast",
        temperature=0.0,
        max_tokens=1024,
    ),

    # 13. Fast AI Assistant
    ModelInfo(
        model_id="z-ai/glm-4.5-air",
        role="fast_ai_assistant",
        task_types=[
            AITaskType.SECURITY_ASSISTANT,
            AITaskType.DEVICE_SUMMARY,
            AITaskType.REPORT_SUMMARY,
        ],
        priority=1,
        fallback_priority=1,
        context_length=131072,
        cost_tier="low",
        reasoning_capability="fast",
        temperature=0.1,
        max_tokens=1500,
    ),

    # 14. Complex AI Assistant
    ModelInfo(
        model_id="z-ai/glm-4.5",
        role="complex_ai_assistant",
        task_types=[
            AITaskType.SECURITY_ASSISTANT,
            AITaskType.REPORT_SUMMARY,
            AITaskType.AUDIT_SUMMARY,
        ],
        priority=2,
        fallback_priority=1,
        context_length=131072,
        cost_tier="medium",
        reasoning_capability="deep",
        temperature=0.0,
        max_tokens=2048,
    ),

    # 15. Fast Explanation Fallback
    ModelInfo(
        model_id="google/gemini-2.5-flash-lite",
        role="fast_explanation_fallback",
        task_types=[
            AITaskType.FINDING_EXPLANATION,
            AITaskType.SECURITY_ASSISTANT,
            AITaskType.FRAMEWORK_EXPLANATION,
            AITaskType.DEVICE_SUMMARY,
        ],
        priority=3,
        fallback_priority=4,
        context_length=131072,
        cost_tier="low",
        reasoning_capability="fast",
        temperature=0.1,
        max_tokens=1500,
    ),
]


class ModelRegistry:
    """Centralized registry for configured AI models with health management."""

    _models: Dict[str, ModelInfo] = {}

    @classmethod
    def initialize(cls) -> None:
        """Loads canonical models into memory."""
        cls._models = {m.model_id: m.model_copy(deep=True) for m in CANONICAL_MODELS}

    @classmethod
    def get_model(cls, model_id: str) -> Optional[ModelInfo]:
        if not cls._models:
            cls.initialize()
        return cls._models.get(model_id)

    @classmethod
    def get_all_models(cls) -> List[ModelInfo]:
        if not cls._models:
            cls.initialize()
        return list(cls._models.values())

    @classmethod
    def get_models_for_task(cls, task_type: AITaskType, only_available: bool = True) -> List[ModelInfo]:
        if not cls._models:
            cls.initialize()
        candidates = [
            m for m in cls._models.values()
            if task_type in m.task_types and m.enabled and (not only_available or m.available)
        ]
        # Sort primarily by priority, then fallback priority
        candidates.sort(key=lambda m: (m.priority, m.fallback_priority))
        return candidates

    @classmethod
    def record_success(cls, model_id: str, latency_ms: float) -> None:
        """Records a successful request, resetting failure counter."""
        model = cls.get_model(model_id)
        if model:
            model.last_success = datetime.now(timezone.utc)
            model.last_latency_ms = latency_ms
            model.failure_count = 0
            model.available = True

    @classmethod
    def record_failure(cls, model_id: str, error_msg: str) -> None:
        """Records a failure. If consecutive failures exceed threshold, marks unavailable."""
        model = cls.get_model(model_id)
        if model:
            model.last_failure = datetime.now(timezone.utc)
            model.failure_count += 1
            if model.failure_count >= 3:
                model.available = False

    @classmethod
    def reset_availability(cls) -> None:
        """Manually resets all models to available."""
        for m in cls._models.values():
            m.available = True
            m.failure_count = 0

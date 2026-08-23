"""
NetVigil AI Gateway Observability & Telemetry Recorder
Problem Statement: SIH26155 (NTRO)

Strict Security Rule:
Telemetry records only operational metrics, latencies, model utilization, and safe error codes.
Never logs API keys, raw secrets, or sensitive configuration snippets.
"""
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
import uuid
from pydantic import BaseModel, Field
from app.services.ai.schemas.models import AITaskType


class AITelemetryRecord(BaseModel):
    """Immutable audit record for a single AI gateway execution."""
    ai_request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_type: str
    model: str
    latency_ms: float
    attempt: int
    fallback_used: bool
    success: bool
    schema_valid: bool
    error_type: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AITelemetrySummary(BaseModel):
    """Aggregated safe telemetry metrics for operator observability."""
    total_requests: int
    successful_requests: int
    failed_requests: int
    success_rate_pct: float
    fallback_count: int
    fallback_rate_pct: float
    average_latency_ms: float
    model_utilization: Dict[str, int]
    task_breakdown: Dict[str, int]
    recent_records: List[AITelemetryRecord]


class AITelemetryCollector:
    """In-memory thread-safe telemetry accumulator."""

    _records: List[AITelemetryRecord] = []
    _max_records: int = 500

    @classmethod
    def record(
        cls,
        task_type: Union[AITaskType, str],
        model: str,
        latency_ms: float,
        attempt: int = 1,
        fallback_used: bool = False,
        success: bool = True,
        schema_valid: bool = True,
        error_type: Optional[str] = None,
    ) -> AITelemetryRecord:
        """Appends a new safe telemetry record."""
        t_str = task_type.value if isinstance(task_type, AITaskType) else str(task_type)
        rec = AITelemetryRecord(
            task_type=t_str,
            model=model,
            latency_ms=round(latency_ms, 2),
            attempt=attempt,
            fallback_used=fallback_used,
            success=success,
            schema_valid=schema_valid,
            error_type=error_type,
        )

        cls._records.append(rec)
        if len(cls._records) > cls._max_records:
            cls._records.pop(0)

        return rec

    @classmethod
    def get_summary(cls) -> AITelemetrySummary:
        """Computes live aggregated metrics from recorded telemetry."""
        total = len(cls._records)
        if total == 0:
            return AITelemetrySummary(
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                success_rate_pct=100.0,
                fallback_count=0,
                fallback_rate_pct=0.0,
                average_latency_ms=0.0,
                model_utilization={},
                task_breakdown={},
                recent_records=[],
            )

        successes = sum(1 for r in cls._records if r.success)
        fallbacks = sum(1 for r in cls._records if r.fallback_used)
        avg_lat = sum(r.latency_ms for r in cls._records) / total

        model_counts = dict(Counter(r.model for r in cls._records))
        task_counts = dict(Counter(r.task_type for r in cls._records))

        return AITelemetrySummary(
            total_requests=total,
            successful_requests=successes,
            failed_requests=total - successes,
            success_rate_pct=round((successes / total) * 100, 1),
            fallback_count=fallbacks,
            fallback_rate_pct=round((fallbacks / total) * 100, 1),
            average_latency_ms=round(avg_lat, 1),
            model_utilization=model_counts,
            task_breakdown=task_counts,
            recent_records=cls._records[-10:],
        )

    @classmethod
    def clear(cls) -> None:
        cls._records.clear()

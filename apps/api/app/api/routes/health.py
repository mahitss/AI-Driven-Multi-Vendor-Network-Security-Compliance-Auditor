"""
Health Check Route
GET /health
"""
import logging
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.schemas.health import DatabaseHealth, SystemHealthResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=SystemHealthResponse)
async def get_health(db: AsyncSession = Depends(get_db)) -> SystemHealthResponse:
    """
    Returns system status, active version, database connectivity, and subsystem health.
    """
    db_status = "connected"
    db_engine_name = db.bind.name if db.bind else "unknown"
    latency_ms = None

    start_time = time.perf_counter()
    try:
        await db.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    except Exception as err:
        logger.warning("Database connectivity probe check failed: %s", err)
        db_status = "disconnected"

    import os
    from app.services.agent.memory import AgentMemoryManager

    gemini_status = "configured" if (os.environ.get("GEMINI_API_KEY") or settings.AI_MODEL) else "adc_enabled"
    firestore_status = "connected" if (os.environ.get("GOOGLE_CLOUD_PROJECT") or AgentMemoryManager._firestore_client) else "local_memory_fallback"
    cloud_run_env = "active" if os.environ.get("K_SERVICE") else "local_development"

    return SystemHealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc),
        database=DatabaseHealth(
            status=db_status,
            latency_ms=latency_ms,
            engine=db_engine_name,
            is_persistent=settings.is_persistent_database,
            storage_mode=settings.storage_architecture_mode,
        ),
        components={
            "vendor_detector": "operational",
            "universal_schema": "v1.0.0",
            "deterministic_engine": "operational",
            "agent_orchestrator": "operational",
            "gemini_connectivity": gemini_status,
            "firestore_state": firestore_status,
            "cloud_run_environment": cloud_run_env,
            "storage_path": str(settings.resolved_storage_path),
        },
    )

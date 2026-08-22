"""
Health Check Route
GET /health
"""
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.schemas.health import DatabaseHealth, SystemHealthResponse

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
    except Exception:
        db_status = "disconnected"

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
        ),
        components={
            "vendor_detector": "operational",
            "universal_schema": "v1.0.0",
            "storage_path": str(settings.resolved_storage_path),
            "ai_provider": "openrouter" if settings.OPENROUTER_API_KEY else "mock_airgapped",
        },
    )

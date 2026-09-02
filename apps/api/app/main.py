"""
NetVigil FastAPI Main Application Entrypoint
Problem Statement: SIH26155 (NTRO)
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import (
    agent,
    ai,
    analysis,
    audits,
    auth,
    configurations,
    devices,
    frameworks,
    health,
    overview,
    remediations,
    reports,
    risks,
    training,
)
from app.core.config import settings
from app.core.errors import (
    NetVigilException,
    netvigil_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging import logger
from app.core.middleware import (
    RequestContextMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
    HostValidationMiddleware,
)
from app.db.session import async_engine
import app.models
from app.models.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown event lifecycle."""
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")

    # Production Startup Invariant Validation
    if settings.ENVIRONMENT.lower() == "production":
        insecure_keys = [
            "dev-insecure-secret-key-replace-in-production-sih26155",
            "secret",
            "changeme",
            "default",
            "short-key",
            "",
        ]
        if not settings.SECRET_KEY or settings.SECRET_KEY in insecure_keys or len(settings.SECRET_KEY) < 32:
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: A strong, unguessable SECRET_KEY (minimum 32 characters) "
                "must be configured via environment variable in production mode."
            )
        if settings.DEBUG:
            raise RuntimeError("CRITICAL SECURITY CONFIGURATION ERROR: DEBUG=True is strictly prohibited in production mode.")
        if "*" in settings.ALLOWED_HOSTS or ["*"] == settings.ALLOWED_HOSTS:
            raise RuntimeError("CRITICAL SECURITY CONFIGURATION ERROR: Wildcard '*' in ALLOWED_HOSTS is strictly prohibited in production mode.")
        if "*" in settings.CORS_ORIGINS:
            raise RuntimeError("CRITICAL SECURITY CONFIGURATION ERROR: Wildcard '*' in CORS_ORIGINS is strictly prohibited in production mode.")
        if settings.AUTH_ENABLED and not settings.SUPABASE_URL:
            raise RuntimeError("CRITICAL SECURITY CONFIGURATION ERROR: SUPABASE_URL must be configured in production mode when AUTH_ENABLED=True.")

    # Create tables if not present (supports SQLite and initial Postgres setup)
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            if settings.DATABASE_URL.startswith("sqlite"):
                for tbl in ["configurations", "devices", "audits", "findings", "risk_items", "remediation_proposals"]:
                    try:
                        await conn.exec_driver_sql(f"ALTER TABLE {tbl} ADD COLUMN user_id VARCHAR")
                    except Exception:
                        pass
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.warning(f"Database schema initialization notice: {e}")

    # Lifecycle hooks (controlled via explicit env flags)
    try:
        import os
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            if os.environ.get("CLEAN_DEMO_DATA", "").lower() in ["true", "1", "yes"]:
                from app.db.seed import clean_demo_records
                await clean_demo_records(session)

            # Only seed if explicitly requested via SEED_DEMO_DATA=true (e.g., local offline test harness)
            if os.environ.get("SEED_DEMO_DATA", "").lower() in ["true", "1", "yes"]:
                from app.db.seed import seed_database_if_empty
                await seed_database_if_empty(session)
    except Exception as e:
        logger.warning(f"Database clean/seed lifecycle notice: {e}")

    yield

    logger.info(f"Shutting down {settings.PROJECT_NAME}")
    await async_engine.dispose()


# In production, disable interactive docs and raw openapi schema endpoints unless DEBUG is enabled
is_prod = settings.ENVIRONMENT.lower() == "production"
docs_path = "/docs" if (settings.DEBUG or not is_prod) else None
redoc_path = "/redoc" if (settings.DEBUG or not is_prod) else None
openapi_path = f"{settings.API_PREFIX}/openapi.json" if (settings.DEBUG or not is_prod) else None

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    docs_url=docs_path,
    redoc_url=redoc_path,
    openapi_url=openapi_path,
    lifespan=lifespan,
)

# 1. Standard Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 2. Host Header Validation Middleware
app.add_middleware(HostValidationMiddleware)

# 3. Correlation & Request ID Middleware
app.add_middleware(RequestContextMiddleware)

# 4. Application-Level Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# 5. CORS Middleware
cors_regex = None if is_prod else r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+"

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS],
    allow_origin_regex=cors_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "Content-Disposition", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
)

# Custom Exception Handlers
app.add_exception_handler(NetVigilException, netvigil_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

from fastapi import Depends
from app.core.auth import get_current_user

# Public Health & Auth Helper endpoints
app.include_router(health.router)
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(auth.router, prefix=settings.API_PREFIX)

# API v1 Protected Domain Routes
app.include_router(analysis.router, prefix=settings.API_PREFIX, dependencies=[Depends(get_current_user)])
app.include_router(agent.router, prefix=settings.API_PREFIX, dependencies=[Depends(get_current_user)])
app.include_router(configurations.router, prefix=settings.API_PREFIX, dependencies=[Depends(get_current_user)])
app.include_router(audits.router, prefix=settings.API_PREFIX, dependencies=[Depends(get_current_user)])
app.include_router(devices.router, prefix=settings.API_PREFIX, dependencies=[Depends(get_current_user)])
app.include_router(frameworks.router, prefix=settings.API_PREFIX, dependencies=[Depends(get_current_user)])
app.include_router(ai.router, prefix=settings.API_PREFIX, dependencies=[Depends(get_current_user)])
app.include_router(training.router, prefix=settings.API_PREFIX, dependencies=[Depends(get_current_user)])
app.include_router(risks.router, prefix=settings.API_PREFIX, dependencies=[Depends(get_current_user)])
app.include_router(remediations.router, prefix=settings.API_PREFIX, dependencies=[Depends(get_current_user)])
app.include_router(reports.router, prefix=settings.API_PREFIX, dependencies=[Depends(get_current_user)])
app.include_router(overview.router, prefix=settings.API_PREFIX, dependencies=[Depends(get_current_user)])


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "health_check": "/health",
        "documentation": "/docs" if docs_path else "Disabled in production",
        "api_prefix": settings.API_PREFIX,
    }

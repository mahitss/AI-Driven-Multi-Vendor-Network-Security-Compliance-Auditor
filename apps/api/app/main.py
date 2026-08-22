"""
NetVigil FastAPI Main Application Entrypoint
Problem Statement: SIH26155 (NTRO)
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import ai, audits, configurations, frameworks, health, overview
from app.core.config import settings
from app.core.errors import (
    NetVigilException,
    netvigil_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging import logger
from app.core.middleware import RequestContextMiddleware
from app.db.session import async_engine
from app.models.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown event lifecycle."""
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")

    # Create tables if not present (supports SQLite and initial Postgres setup)
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.warning(f"Database schema initialization notice: {e}")

    yield

    logger.info(f"Shutting down {settings.PROJECT_NAME}")
    await async_engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# Correlation & Request ID Middleware
app.add_middleware(RequestContextMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# Custom Exception Handlers
app.add_exception_handler(NetVigilException, netvigil_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Health endpoint (at root level /health)
app.include_router(health.router)

# API v1 Domain Routes
app.include_router(configurations.router, prefix=settings.API_PREFIX)
app.include_router(audits.router, prefix=settings.API_PREFIX)
app.include_router(frameworks.router, prefix=settings.API_PREFIX)
app.include_router(ai.router, prefix=settings.API_PREFIX)
app.include_router(overview.router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "health_check": "/health",
        "documentation": "/docs",
        "api_prefix": settings.API_PREFIX,
    }

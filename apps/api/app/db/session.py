"""
NetVigil Database Engine & Session Management
Supports Async SQLAlchemy with asyncpg / aiosqlite and sync sessionmaker for Alembic migrations.
"""
from typing import AsyncGenerator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Determine DB parameters
is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# Common pool arguments for resilient connection management
async_engine_kwargs: dict = {
    "echo": settings.DB_ECHO,
    "future": True,
    "pool_pre_ping": True,
}

if is_sqlite:
    async_engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Production PostgreSQL resilience (Supabase / Render / Cloud Run)
    # Recycles connections every 300s to avoid firewall/NAT idle disconnects
    # Disables statement cache for transaction pooler / PgBouncer compatibility
    async_engine_kwargs["pool_recycle"] = 300
    async_engine_kwargs["pool_size"] = 10
    async_engine_kwargs["max_overflow"] = 20
    async_engine_kwargs["connect_args"] = {"statement_cache_size": 0}

# Async Engine for FastAPI Request Handlers
async_engine = create_async_engine(
    settings.DATABASE_URL,
    **async_engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

sync_engine_kwargs: dict = {
    "echo": settings.DB_ECHO,
    "pool_pre_ping": True,
}

if "sqlite" in settings.SYNC_DATABASE_URL:
    sync_engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    sync_engine_kwargs["pool_recycle"] = 300
    sync_engine_kwargs["pool_size"] = 10
    sync_engine_kwargs["max_overflow"] = 20

# Sync Engine for Alembic & synchronous initialization
sync_engine = create_engine(
    settings.SYNC_DATABASE_URL,
    **sync_engine_kwargs,
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for injecting async database sessions into FastAPI routes."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

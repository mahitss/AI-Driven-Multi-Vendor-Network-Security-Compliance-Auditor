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

# Async Engine for FastAPI Request Handlers
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    future=True,
    connect_args={"check_same_thread": False} if is_sqlite else {},
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Sync Engine for Alembic & synchronous initialization
sync_engine = create_engine(
    settings.SYNC_DATABASE_URL,
    echo=settings.DB_ECHO,
    connect_args={"check_same_thread": False} if "sqlite" in settings.SYNC_DATABASE_URL else {},
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

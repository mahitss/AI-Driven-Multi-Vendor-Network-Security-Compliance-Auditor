"""
FastAPI Route Dependencies
"""
from typing import Annotated, AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

DatabaseDep = Annotated[AsyncSession, Depends(get_db)]

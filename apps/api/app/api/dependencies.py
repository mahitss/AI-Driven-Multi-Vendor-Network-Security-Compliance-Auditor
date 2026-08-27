"""
FastAPI Route Dependencies
"""
from typing import Annotated, Optional
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.auth import AuthenticatedUser, get_current_user, get_optional_user

DatabaseDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[AuthenticatedUser, Depends(get_current_user)]
OptionalUserDep = Annotated[Optional[AuthenticatedUser], Depends(get_optional_user)]

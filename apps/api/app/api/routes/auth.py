"""
User Profile and Authentication Supporting API Routes
Problem Statement: SIH26155 (NTRO)
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.core.auth import revoke_token
from app.models.user import Profile

router = APIRouter(prefix="/auth", tags=["Authentication & Profiles"])


class ResolveUsernameRequest(BaseModel):
    identifier: str = Field(..., min_length=1, max_length=100, description="Username or Email to resolve")


class ResolveUsernameResponse(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    found: bool


class LogoutResponse(BaseModel):
    status: str = "logged_out"
    message: str = "Session token invalidated"


class ProfileRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


@router.post(
    "/resolve-username",
    response_model=ResolveUsernameResponse,
    summary="Securely resolve a username to login email identifier",
)
async def resolve_username(
    payload: ResolveUsernameRequest,
    db: DatabaseDep,
) -> ResolveUsernameResponse:
    identifier = payload.identifier.strip()
    if "@" in identifier:
        return ResolveUsernameResponse(email=identifier, found=True)

    stmt = select(Profile).where(Profile.username.ilike(identifier)).limit(1)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()

    if profile and profile.email:
        return ResolveUsernameResponse(
            email=profile.email,
            username=profile.username,
            found=True,
        )

    return ResolveUsernameResponse(email=None, username=None, found=False)


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Explicitly terminate session and invalidate backend cached verification",
)
async def logout_session(
    request: Request,
    current_user: CurrentUserDep,
) -> LogoutResponse:
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        revoke_token(token)
    return LogoutResponse(status="logged_out", message="Session token invalidated")


@router.get(
    "/profile",
    response_model=Optional[ProfileResponse],
    summary="Get current user's profile",
)
async def get_current_user_profile(
    current_user: CurrentUserDep,
    db: DatabaseDep,
) -> Optional[ProfileResponse]:
    stmt = select(Profile).where(Profile.id == current_user.id).limit(1)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()
    if not profile:
        return None
    return ProfileResponse(
        id=profile.id,
        username=profile.username,
        email=profile.email,
        full_name=profile.full_name,
        avatar_url=profile.avatar_url,
    )


@router.post(
    "/profile",
    response_model=ProfileResponse,
    summary="Create or update current user's profile with unique username",
)
async def upsert_current_user_profile(
    payload: ProfileRequest,
    current_user: CurrentUserDep,
    db: DatabaseDep,
) -> ProfileResponse:
    username_clean = payload.username.strip().lower()

    # Verify uniqueness
    existing_stmt = select(Profile).where(
        Profile.username.ilike(username_clean),
        Profile.id != current_user.id,
    ).limit(1)
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken by another operator. Please choose a different username.",
        )

    stmt = select(Profile).where(Profile.id == current_user.id).limit(1)
    profile = (await db.execute(stmt)).scalar_one_or_none()

    if not profile:
        profile = Profile(
            id=current_user.id,
            username=username_clean,
            email=payload.email or current_user.email,
            full_name=payload.full_name,
            avatar_url=payload.avatar_url,
        )
        db.add(profile)
    else:
        profile.username = username_clean
        if payload.email:
            profile.email = payload.email
        if payload.full_name is not None:
            profile.full_name = payload.full_name
        if payload.avatar_url is not None:
            profile.avatar_url = payload.avatar_url

    await db.commit()
    await db.refresh(profile)

    return ProfileResponse(
        id=profile.id,
        username=profile.username,
        email=profile.email,
        full_name=profile.full_name,
        avatar_url=profile.avatar_url,
    )

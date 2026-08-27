"""
NetVigil Supabase JWT Authentication & Identity Verification Module
SIH26155 — NTRO Network Security Compliance Auditor
"""
import json
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Optional, Tuple
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging import logger

security_bearer = HTTPBearer(auto_error=False)

# In-memory verified token cache: token_hash -> (AuthenticatedUser, expires_at_timestamp)
_verified_token_cache: Dict[str, Tuple["AuthenticatedUser", float]] = {}


class AuthenticatedUser(BaseModel):
    """Normalized verified identity model from Supabase Auth / Google OAuth."""
    id: str = Field(..., description="Supabase unique user UUID")
    email: Optional[str] = Field(None, description="Primary verified user email")
    role: str = Field("auditor", description="Application RBAC role")
    app_metadata: Dict[str, Any] = Field(default_factory=dict)
    user_metadata: Dict[str, Any] = Field(default_factory=dict)


def _verify_with_supabase_api(token: str, supabase_url: str, apikey: str) -> Optional[Dict[str, Any]]:
    """
    Directly verify a Supabase access JWT against the live Supabase Auth /user endpoint.
    Used when Supabase signs JWTs with asymmetric keys (RS256/ES256) or when SUPABASE_JWT_SECRET
    is not locally synchronized.
    """
    clean_url = supabase_url.rstrip("/")
    if "placeholder-project" in clean_url or not clean_url.startswith("http"):
        return None

    req = urllib.request.Request(
        f"{clean_url}/auth/v1/user",
        headers={
            "apikey": apikey or "sb_publishable_-OjNhAi0G1ARbRjZEuZ3zQ_TM5pS0hN",
            "Authorization": f"Bearer {token}",
            "User-Agent": "NetVigil-Security-Auditor/1.0",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=4) as res:
            if res.status == 200:
                data = json.loads(res.read().decode("utf-8"))
                return data
    except urllib.error.HTTPError as e:
        logger.debug(f"[auth] Supabase Auth verification rejected token (HTTP {e.code})")
        return None
    except Exception as e:
        logger.debug(f"[auth] Supabase Auth endpoint request failed: {e}")
        return None
    return None


def verify_supabase_jwt(token: str) -> AuthenticatedUser:
    """
    Cryptographically verify and decode a Supabase Auth access JWT.
    Supports HMAC verification via SUPABASE_JWT_SECRET as well as direct
    Supabase Auth server-side verification with in-memory TTL caching.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token: token string is missing or empty.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )

    now = time.time()

    # 1. Fast path: Check in-memory verified cache
    if token in _verified_token_cache:
        cached_user, expires_at = _verified_token_cache[token]
        if now < expires_at:
            return cached_user
        else:
            del _verified_token_cache[token]

    # 2. Inspect unverified header and payload for structural validation and expiration
    try:
        unverified_header = jwt.get_unverified_header(token)
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token: Unable to parse JWT header or payload.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        ) from e

    # Check token expiration
    exp = unverified_payload.get("exp")
    if exp and exp < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please re-authenticate.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token", error_description="token expired"'},
        )

    alg = unverified_header.get("alg", "HS256")
    verified_payload: Optional[Dict[str, Any]] = None

    # 3. Strategy A: Try local HMAC verification with SUPABASE_JWT_SECRET if configured
    if settings.SUPABASE_JWT_SECRET:
        try:
            verified_payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=[alg, "HS256", "HS384", "HS512"],
                options={"verify_signature": True, "verify_exp": True, "verify_aud": False},
            )
        except jwt.ExpiredSignatureError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired. Please re-authenticate.",
                headers={"WWW-Authenticate": 'Bearer error="invalid_token", error_description="token expired"'},
            ) from e
        except Exception:
            verified_payload = None

    # 4. Strategy B: If HMAC verification didn't succeed, verify with Supabase Auth API
    if not verified_payload and settings.SUPABASE_URL and not settings.SUPABASE_URL.startswith("https://test-"):
        supabase_user_data = _verify_with_supabase_api(
            token=token,
            supabase_url=settings.SUPABASE_URL,
            apikey=getattr(settings, "SUPABASE_ANON_KEY", ""),
        )
        if supabase_user_data and "id" in supabase_user_data:
            user_id = supabase_user_data.get("id")
            email = supabase_user_data.get("email")
            user_meta = supabase_user_data.get("user_metadata", {})
            app_meta = supabase_user_data.get("app_metadata", {})
            role = app_meta.get("role") or "auditor"

            user = AuthenticatedUser(
                id=str(user_id),
                email=email,
                role=role,
                app_metadata=app_meta,
                user_metadata=user_meta,
            )
            # Cache for min(300s, remaining token lifetime)
            cache_ttl = min(300.0, max(10.0, (exp - now) if exp else 300.0))
            _verified_token_cache[token] = (user, now + cache_ttl)
            return user

    # 5. Strategy C: Try SECRET_KEY verification (for local/testing tokens)
    if not verified_payload and settings.SECRET_KEY:
        try:
            verified_payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[alg, "HS256", "HS384", "HS512"],
                options={"verify_signature": True, "verify_exp": True, "verify_aud": False},
            )
        except Exception:
            verified_payload = None

    # 6. If all cryptographic verification attempts fail, reject with 401
    if not verified_payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token cryptographic signature verification failed.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token", error_description="invalid signature"'},
        )

    # 7. Check subject claim
    user_id = verified_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing mandatory subject (sub) claim.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )

    # Verify audience if defined
    aud = verified_payload.get("aud")
    if aud and settings.AUTH_AUDIENCE:
        if isinstance(aud, list) and settings.AUTH_AUDIENCE not in aud and "authenticated" not in aud:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token audience claim.",
                headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
            )
        elif isinstance(aud, str) and aud not in [settings.AUTH_AUDIENCE, "authenticated", "anon"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token audience claim.",
                headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
            )

    email = verified_payload.get("email") or verified_payload.get("user_metadata", {}).get("email")
    role = verified_payload.get("role") or verified_payload.get("app_metadata", {}).get("role", "auditor")
    app_meta = verified_payload.get("app_metadata", {})
    user_meta = verified_payload.get("user_metadata", {})

    user = AuthenticatedUser(
        id=str(user_id),
        email=email,
        role=role,
        app_metadata=app_meta,
        user_metadata=user_meta,
    )

    cache_ttl = min(300.0, max(10.0, (exp - now) if exp else 300.0))
    _verified_token_cache[token] = (user, now + cache_ttl)
    return user


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> AuthenticatedUser:
    """
    FastAPI dependency for verifying authenticated Supabase requests.
    Enforces Bearer token verification across protected API endpoints.
    """
    # 1. If Bearer token is provided in request, verify it cryptographically
    if credentials and credentials.credentials:
        return verify_supabase_jwt(credentials.credentials)

    # 2. Check direct Authorization header if HTTPBearer parser did not catch it
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header:
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()
            return verify_supabase_jwt(token)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed authorization header. Expected format: 'Bearer <token>'",
                headers={"WWW-Authenticate": 'Bearer error="invalid_request"'},
            )

    # 3. If no token is provided:
    is_production = settings.ENVIRONMENT.lower() == "production"
    has_configured_jwt_secret = bool(settings.SUPABASE_JWT_SECRET)

    if is_production or has_configured_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing or invalid Authorization Bearer header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. In development / testing environment without configured Supabase secrets,
    # provide a safe fallback auditor identity.
    return AuthenticatedUser(
        id="00000000-0000-0000-0000-000000000001",
        email="auditor@netvigil.local",
        role="auditor",
        app_metadata={"provider": "local_dev"},
        user_metadata={"full_name": "Development Auditor"},
    )


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> Optional[AuthenticatedUser]:
    """Optional user dependency for endpoints that adapt behavior if authenticated."""
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None

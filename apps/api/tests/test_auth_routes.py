"""
Tests for Auth and User Profile Routes
Problem Statement: SIH26155 (NTRO)
"""
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
import jwt
from datetime import datetime, timezone, timedelta

from app.main import app
from app.core.config import settings


def _create_jwt(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=2)).timestamp()),
    }
    key = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY or "netvigil-secure-test-jwt-secret-key-32b"
    return jwt.encode(payload, key, algorithm="HS256")


@pytest.mark.asyncio
async def test_resolve_username_email_passthrough(client: AsyncClient):
    res = await client.post(
        "/api/v1/auth/resolve-username",
        json={"identifier": "analyst@enterprise.mil"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "analyst@enterprise.mil"
    assert data["found"] is True


@pytest.mark.asyncio
async def test_upsert_and_resolve_profile_username(client: AsyncClient):
    uid = f"usr_{uuid.uuid4().hex[:8]}"
    username = f"callsign_{uuid.uuid4().hex[:6]}"
    email = f"{username}@agency.gov"
    token = _create_jwt(uid, email)
    headers = {"Authorization": f"Bearer {token}"}

    # Create profile
    prof_res = await client.post(
        "/api/v1/auth/profile",
        json={
            "username": username,
            "email": email,
            "full_name": "Lead Analyst",
        },
        headers=headers,
    )
    assert prof_res.status_code == 200
    pdata = prof_res.json()
    assert pdata["username"] == username.lower()
    assert pdata["id"] == uid

    # Fetch profile
    get_res = await client.get("/api/v1/auth/profile", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["username"] == username.lower()

    # Resolve username back to email
    resolve_res = await client.post(
        "/api/v1/auth/resolve-username",
        json={"identifier": username},
    )
    assert resolve_res.status_code == 200
    rdata = resolve_res.json()
    assert rdata["found"] is True
    assert rdata["email"] == email


"""Tests for WorkerClient Fail-Safe & Deterministic Python Fallback."""

import hashlib
import pytest
from app.services.worker.client import WorkerClient


@pytest.mark.asyncio
async def test_worker_client_disabled_by_default():
    """Go worker is disabled by default and gracefully reports fallback_active."""
    client = WorkerClient(enabled=False)
    assert not client.is_enabled

    health = await client.check_health()
    assert health["status"] == "disabled"
    assert health["healthy"] is False
    assert health["fallback_active"] is True


@pytest.mark.asyncio
async def test_worker_client_offline_unreachable():
    """Unreachable Go worker gracefully returns unavailable without raising exceptions."""
    client = WorkerClient(worker_url="http://127.0.0.1:9999", enabled=True, timeout=0.2)
    health = await client.check_health()

    assert health["status"] == "unavailable"
    assert health["healthy"] is False
    assert health["fallback_active"] is True


@pytest.mark.asyncio
async def test_preflight_config_python_fallback():
    """Preflight config cleanly falls back to deterministic local Python calculations."""
    client = WorkerClient(enabled=False)

    raw_config = "hostname CORE-RTR-01\n!\ninterface GigabitEthernet0/0\n ip address 10.0.0.1 255.255.255.0\n"
    res = await client.preflight_config(raw_config)

    assert res["source"] == "python_fallback"
    expected_sha = hashlib.sha256(raw_config.encode("utf-8")).hexdigest()
    assert res["sha256"] == expected_sha
    assert res["line_count"] == 5
    assert res["non_empty_lines"] == 4
    assert res["byte_size"] == len(raw_config.encode("utf-8"))
    assert res["is_utf8"] is True
    assert res["has_null_bytes"] is False


@pytest.mark.asyncio
async def test_sanitize_text_python_fallback():
    """Text sanitization cleanly masks passwords in local Python fallback."""
    client = WorkerClient(enabled=False)

    text = "enable secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0\nusername admin password 7 0822455D0A16"
    res = await client.sanitize_text(text)

    assert res["source"] == "python_fallback"
    assert res["redaction_count"] >= 1
    assert "0822455D0A16" not in res["sanitized_text"]
    assert "[REDACTED_BY_WORKER]" in res["sanitized_text"]

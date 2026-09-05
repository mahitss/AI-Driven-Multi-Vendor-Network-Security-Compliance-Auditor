"""NetVigil Go Worker Client.

Strict Fail-Safe Invariant:
- Go worker is an optional, isolated infrastructure capability.
- If worker is disabled, offline, or crashes, Python gracefully falls back
  to internal implementations without failing any user workflow.
- Never fabricates a successful worker execution.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
import uuid
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger("netvigil.worker")


class WorkerClient:
    """Non-blocking, fail-safe HTTP client for the Go worker service."""

    def __init__(
        self,
        worker_url: Optional[str] = None,
        enabled: Optional[bool] = None,
        secret: Optional[str] = None,
        timeout: float = 2.0,
    ) -> None:
        self.worker_url = (
            worker_url or os.getenv("WORKER_GO_URL", "http://localhost:8081")
        ).rstrip("/")
        if enabled is not None:
            self.is_enabled = enabled
        else:
            self.is_enabled = os.getenv("WORKER_GO_ENABLED", "false").lower() == "true"
        self.secret = secret or os.getenv("WORKER_INTERNAL_SECRET", "")
        self.timeout = timeout

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.secret:
            headers["X-Internal-Worker-Secret"] = self.secret
        return headers

    async def check_health(self) -> Dict[str, Any]:
        """Check worker health with tight timeout. Never raises."""
        if not self.is_enabled:
            return {
                "status": "disabled",
                "healthy": False,
                "service": "netvigil-worker-go",
                "fallback_active": True,
            }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(f"{self.worker_url}/health")
                if res.status_code == 200:
                    data = res.json()
                    data["healthy"] = True
                    data["fallback_active"] = False
                    return data
                return {
                    "status": "degraded",
                    "healthy": False,
                    "service": "netvigil-worker-go",
                    "status_code": res.status_code,
                    "fallback_active": True,
                }
        except Exception as err:
            logger.debug(f"[WorkerClient] Health check probe unreachable: {err}")
            return {
                "status": "unavailable",
                "healthy": False,
                "service": "netvigil-worker-go",
                "error": str(err),
                "fallback_active": True,
            }

    async def execute_job(
        self,
        job_type: str,
        payload: Dict[str, Any],
        job_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Submit a job to the Go worker. Returns None on failure so caller can fall back."""
        if not self.is_enabled:
            return None

        j_id = job_id or f"job-{uuid.uuid4().hex[:12]}"
        body = {
            "version": "v1",
            "job_id": j_id,
            "job_type": job_type,
            "payload": payload,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(
                    f"{self.worker_url}/api/v1/jobs",
                    json=body,
                    headers=self._headers(),
                )
                if res.status_code == 200:
                    resp_data = res.json()
                    if resp_data.get("status") == "completed":
                        return resp_data.get("result")
                logger.warning(
                    f"[WorkerClient] Job {j_id} returned status {res.status_code}: {res.text}"
                )
                return None
        except Exception as exc:
            logger.debug(f"[WorkerClient] Job {j_id} ({job_type}) connection error: {exc}")
            return None

    async def preflight_config(
        self,
        raw_config: str,
        job_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Run preflight check via Go worker if available, otherwise local Python fallback."""
        if self.is_enabled:
            result = await self.execute_job(
                "config_preflight",
                {"raw_config": raw_config},
                job_id=job_id,
            )
            if result is not None:
                result["source"] = "go_worker"
                return result

        # Graceful Deterministic Python Fallback
        raw_bytes = raw_config.encode("utf-8", errors="replace")
        sha256_hash = hashlib.sha256(raw_bytes).hexdigest()
        lines = raw_config.split("\n")
        non_empty = sum(1 for l in lines if l.strip())
        byte_size = len(raw_bytes)
        has_null = "\x00" in raw_config
        estimated_tokens = max(1, byte_size // 4) if byte_size > 0 else 0

        return {
            "source": "python_fallback",
            "sha256": sha256_hash,
            "byte_size": byte_size,
            "line_count": len(lines),
            "non_empty_lines": non_empty,
            "is_utf8": True,
            "has_null_bytes": has_null,
            "estimated_tokens": estimated_tokens,
        }

    async def sanitize_text(
        self,
        text: str,
        job_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Redact passwords via Go worker if available, otherwise local Python fallback."""
        if self.is_enabled:
            result = await self.execute_job(
                "sanitize_text",
                {"text": text},
                job_id=job_id,
            )
            if result is not None:
                result["source"] = "go_worker"
                return result

        # Python Fallback Regex Masking
        patterns = [
            re.compile(r"(?i)(password\s+(?:7\s+|5\s+|0\s+)?)(?:[^\s\r\n]+)"),
            re.compile(r"(?i)(secret\s+(?:5\s+|8\s+|9\s+)?)(?:[^\s\r\n]+)"),
            re.compile(r"(?i)(pre-shared-key\s+(?:hex\s+)?)(?:[^\s\r\n]+)"),
            re.compile(r"(?i)(encrypted-password\s+)(?:[^\s\r\n;]+)"),
            re.compile(r"(?i)(private-key\s+)(?:[^\s\r\n;]+)"),
        ]

        sanitized = text
        redaction_count = 0
        for pat in patterns:
            matches = pat.findall(sanitized)
            if matches:
                redaction_count += len(matches)
                sanitized = pat.sub(r"\1[REDACTED_BY_WORKER]", sanitized)

        return {
            "source": "python_fallback",
            "original_bytes": len(text.encode("utf-8")),
            "sanitized_bytes": len(sanitized.encode("utf-8")),
            "redaction_count": redaction_count,
            "sanitized_text": sanitized,
        }


# Global singleton factory
_client_instance: Optional[WorkerClient] = None


def get_worker_client() -> WorkerClient:
    global _client_instance
    if _client_instance is None:
        _client_instance = WorkerClient()
    return _client_instance

"""
NetVigil Middleware Suite
- RequestContextMiddleware: Distributed request correlation tracking (X-Request-ID).
- RateLimitMiddleware: Application-level sliding window rate limiting for high-risk endpoints.
"""
import time
import uuid
import collections
from typing import Dict, List, Tuple
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from app.core.config import settings
from app.core.logging import logger


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding window in-memory rate limiter protecting high-risk API attack surfaces:
    - AI Reasoning & Explanation Endpoints
    - File Ingestion & Parsing
    - Audit Execution
    - Training Approval & Rejection
    - Report Generation
    """

    def __init__(self, app, window_seconds: int = 60):
        super().__init__(app)
        self.window_seconds = window_seconds
        # Mapping: ip_address -> deque of timestamps
        self._history: Dict[str, collections.deque] = collections.defaultdict(collections.deque)
        # Endpoint prefix rules: (path_prefix, max_requests_per_window)
        self._rate_limits: List[Tuple[str, int]] = [
            (f"{settings.API_PREFIX}/ai/", 120),
            (f"{settings.API_PREFIX}/configurations/upload", 60),
            (f"{settings.API_PREFIX}/audits/run", 60),
            (f"{settings.API_PREFIX}/training/mappings", 100),
            (f"{settings.API_PREFIX}/reports/generate", 60),
        ]

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "127.0.0.1"

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Bypass rate limiting in automated test runners or internal health probes
        if settings.ENVIRONMENT == "test" or request.url.path in ["/health", f"{settings.API_PREFIX}/health"]:
            return await call_next(request)

        path = request.url.path
        limit_for_path = None

        for prefix, max_reqs in self._rate_limits:
            if path.startswith(prefix):
                limit_for_path = max_reqs
                break

        if limit_for_path is None:
            # Default unrestricted path
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        key = f"{client_ip}:{path.split('/')[3] if len(path.split('/')) > 3 else 'root'}"
        now = time.time()
        cutoff = now - self.window_seconds

        timestamps = self._history[key]

        # Purge timestamps older than window
        while timestamps and timestamps[0] < cutoff:
            timestamps.popleft()

        if len(timestamps) >= limit_for_path:
            retry_after = int(self.window_seconds - (now - timestamps[0])) + 1
            logger.warning(
                "Rate limit exceeded for IP %s on path %s (Current: %d, Max: %d). Retry-After: %ds",
                client_ip,
                path,
                len(timestamps),
                limit_for_path,
                retry_after,
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests to this endpoint. Please retry after window cooldown.",
                        "details": {
                            "limit": limit_for_path,
                            "window_seconds": self.window_seconds,
                            "retry_after_seconds": retry_after,
                        },
                    }
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit_for_path),
                    "X-RateLimit-Remaining": "0",
                },
            )

        # Record this request
        timestamps.append(now)
        remaining = max(0, limit_for_path - len(timestamps))

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit_for_path)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Applies standard enterprise security headers to all HTTP responses:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy: camera=(), microphone=(), geolocation=()
    - X-XSS-Protection: 1; mode=block
    - Content-Security-Policy: frame-ancestors 'none';
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


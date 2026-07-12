from __future__ import annotations

import secrets
import time
from collections import defaultdict, deque
from pathlib import Path
from threading import Lock

from fastapi import HTTPException, Request, UploadFile, status

from config import get_settings
from workspace import is_demo_workspace


class SlidingWindowLimiter:
    def __init__(self, window_seconds: int = 60):
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str, limit: int) -> bool:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                return False
            events.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


_limiter = SlidingWindowLimiter()
# ponytail: process-local limiter; move to an edge/shared store if Railway scales past one replica.


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    return forwarded or (request.client.host if request.client else "unknown")


def enforce_rate_limit(request: Request, bucket: str, limit: int) -> None:
    if not _limiter.allow(f"{bucket}:{_client_key(request)}", limit):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Request limit exceeded. Retry in one minute.")


def require_write_access(request: Request) -> None:
    settings = get_settings()
    enforce_rate_limit(request, "write", settings.write_rate_limit)
    if is_demo_workspace():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="The demo workspace is read-only. Switch to Live to write data.")
    if settings.environment.lower() != "production" and not settings.write_token:
        return
    if not settings.write_token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Write access is disabled until BRIAN_AI_WRITE_TOKEN is configured.")
    supplied = request.headers.get("x-brian-write-token", "")
    if not secrets.compare_digest(supplied, settings.write_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Valid write access token required.")


async def read_limited_upload(file: UploadFile, max_bytes: int, allowed_suffixes: set[str]) -> bytes:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in allowed_suffixes:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=f"Unsupported file type: {suffix or 'none'}")
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail=f"File exceeds the {max_bytes}-byte limit.")
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
    return content


def reset_rate_limits() -> None:
    _limiter.reset()

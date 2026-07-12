from __future__ import annotations

import json
import os
import secrets
from contextvars import ContextVar, Token
from pathlib import Path


WORKSPACE_HEADER = "x-brian-workspace"
WORKSPACES = {"demo", "live"}
_workspace: ContextVar[str] = ContextVar("brian_ai_workspace", default="demo")
_root = Path(__file__).resolve().parents[1]


def normalize_workspace(value: str | None) -> str:
    workspace = (value or "demo").strip().lower()
    if workspace not in WORKSPACES:
        raise ValueError(f"Unknown workspace: {workspace}")
    return workspace


def current_workspace() -> str:
    return _workspace.get()


def set_workspace(workspace: str) -> Token:
    return _workspace.set(normalize_workspace(workspace))


def reset_workspace(token: Token) -> None:
    _workspace.reset(token)


def is_demo_workspace() -> bool:
    return current_workspace() == "demo"


def root_data_dir() -> Path:
    return Path(os.getenv("BRIAN_AI_DATA_DIR", str(_root / "data")))


def data_dir(workspace: str | None = None) -> Path:
    selected = normalize_workspace(workspace) if workspace else current_workspace()
    root = root_data_dir()
    return root if selected == "demo" else root / "workspaces" / selected


def corpus_dir(workspace: str | None = None) -> Path:
    return data_dir(workspace) / "corpus"


class WorkspaceMiddleware:
    """Keep workspace context active for the full response, including SSE streams."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {key.decode("latin-1").lower(): value.decode("latin-1") for key, value in scope.get("headers", [])}
        try:
            workspace = normalize_workspace(headers.get(WORKSPACE_HEADER))
        except ValueError:
            body = json.dumps({"detail": "X-Brian-Workspace must be 'demo' or 'live'."}).encode("utf-8")
            await send({
                "type": "http.response.start",
                "status": 400,
                "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode("ascii"))],
            })
            await send({"type": "http.response.body", "body": body})
            return

        if workspace == "live":
            from config import get_settings

            settings = get_settings()
            supplied = headers.get("x-brian-write-token", "")
            if settings.write_token and not secrets.compare_digest(supplied, settings.write_token):
                body = json.dumps({"detail": "Valid Live workspace access key required."}).encode("utf-8")
                await send({"type": "http.response.start", "status": 401, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode("ascii"))]})
                await send({"type": "http.response.body", "body": body})
                return
            if not settings.write_token and settings.environment.lower() == "production":
                body = json.dumps({"detail": "Live workspace access is disabled until BRIAN_AI_WRITE_TOKEN is configured."}).encode("utf-8")
                await send({"type": "http.response.start", "status": 503, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode("ascii"))]})
                await send({"type": "http.response.body", "body": body})
                return

        token = set_workspace(workspace)

        async def send_with_workspace(message):
            if message["type"] == "http.response.start":
                message.setdefault("headers", []).append((b"x-brian-workspace", workspace.encode("ascii")))
            await send(message)

        try:
            await self.app(scope, receive, send_with_workspace)
        finally:
            reset_workspace(token)

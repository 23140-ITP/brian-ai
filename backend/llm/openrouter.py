from __future__ import annotations

import base64
import json
import re
import urllib.error
import urllib.request

from config import get_settings

TAG_RE = re.compile(r"\b(?:P|HE|V|K|T)-\d+[A-Z]?\b", re.IGNORECASE)


def is_configured() -> bool:
    settings = get_settings()
    return bool(settings.openrouter_api_key and settings.use_openrouter)


def generate_answer(query: str, context: str, model: str) -> str | None:
    if not is_configured():
        return None

    settings = get_settings()
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are Brian AI, an industrial knowledge assistant. Answer only from the supplied refinery evidence and keep citations implicit in the evidence summary.",
            },
            {
                "role": "user",
                "content": f"Question: {query}\n\nEvidence:\n{context[:6000]}",
            },
        ],
        "temperature": 0.2,
    }
    request = urllib.request.Request(
        f"{settings.openrouter_base_url.rstrip('/')}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://brian-ai.local",
            "X-Title": "Brian AI",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None

    choices = data.get("choices") or []
    if not choices:
        return None
    message = choices[0].get("message") or {}
    content = message.get("content")
    return content.strip() if isinstance(content, str) and content.strip() else None


def extract_nameplate_tag(filename: str, content: bytes, mime_type: str = "image/jpeg") -> tuple[str | None, float] | None:
    if not is_configured():
        return None

    settings = get_settings()
    payload = {
        "model": settings.openrouter_vision_model,
        "messages": [
            {
                "role": "system",
                "content": "You extract industrial equipment tags from nameplate images. Return only the tag, such as P-204B, HE-101, V-301, K-101, or T-201. Return UNKNOWN if no tag is visible.",
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"Read the equipment tag from this refinery nameplate image. Filename: {filename}",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{base64.b64encode(content).decode('ascii')}"},
                    },
                ],
            },
        ],
        "temperature": 0,
    }
    request = urllib.request.Request(
        f"{settings.openrouter_base_url.rstrip('/')}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://brian-ai.local",
            "X-Title": "Brian AI",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None

    choices = data.get("choices") or []
    if not choices:
        return None
    message = choices[0].get("message") or {}
    text = message.get("content")
    if not isinstance(text, str):
        return None
    match = TAG_RE.search(text)
    if not match:
        return None
    return match.group(0).upper(), 0.94

from __future__ import annotations

import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from llm.openrouter import extract_nameplate_tag as openrouter_extract_nameplate_tag
from llm.openrouter import is_configured as openrouter_configured


TAG_RE = re.compile(rb"\b(?:P|HE|V|K|T)-\d+[A-Z]?\b", re.IGNORECASE)


def _normalize_tag(raw: bytes | str) -> str | None:
    if isinstance(raw, str):
        raw_bytes = raw.encode("utf-8", errors="ignore")
    else:
        raw_bytes = raw
    match = TAG_RE.search(raw_bytes)
    return match.group(0).decode("ascii").upper() if match else None


def tesseract_available() -> bool:
    return shutil.which("tesseract") is not None


def _extract_with_tesseract(content: bytes) -> str | None:
    if not tesseract_available():
        return None
    with tempfile.TemporaryDirectory() as directory:
        image_path = Path(directory) / "nameplate-image"
        image_path.write_bytes(content)
        try:
            result = subprocess.run(
                ["tesseract", str(image_path), "stdout", "--psm", "6"],
                capture_output=True,
                check=False,
                timeout=8,
            )
        except (OSError, subprocess.TimeoutExpired):
            return None
    if result.returncode != 0:
        return None
    return _normalize_tag(result.stdout)


def extract_tag_from_upload(filename: str, content: bytes, content_type: str = "image/jpeg") -> dict:
    filename_match = TAG_RE.search(filename.encode("utf-8", errors="ignore"))
    if filename_match:
        return {"tag": filename_match.group(0).decode("ascii").upper(), "confidence": 0.92, "provider": "filename"}

    vision_result = openrouter_extract_nameplate_tag(filename, content, content_type)
    if vision_result:
        tag, confidence = vision_result
        return {"tag": tag, "confidence": confidence, "provider": "openrouter-vision"}

    tesseract_tag = _extract_with_tesseract(content)
    if tesseract_tag:
        return {"tag": tesseract_tag, "confidence": 0.82, "provider": "tesseract"}

    content_match = TAG_RE.search(content[:4096])
    if content_match:
        return {"tag": content_match.group(0).decode("ascii").upper(), "confidence": 0.86, "provider": "byte-pattern"}

    return {"tag": "P-204B", "confidence": 0.64, "provider": "demo-fallback"}


def ocr_status() -> dict:
    vision_configured = openrouter_configured()
    return {
        "visionConfigured": vision_configured,
        "tesseractAvailable": tesseract_available(),
        "mode": "openrouter-vision" if vision_configured else "local-ocr-fallback",
    }

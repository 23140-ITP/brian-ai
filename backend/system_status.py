from __future__ import annotations

from config import get_settings
from database import neo4j_status
from ingestion.embedding_cache import cache_stats
from llm.openrouter import is_configured as openrouter_configured
from ocr.nameplate import ocr_status


def _check(status_id: str, label: str, status: str, detail: str) -> dict:
    return {"id": status_id, "label": label, "status": status, "detail": detail}


def _public_cors_ready(origins: list[str]) -> bool:
    if not origins:
        return False
    return all(origin != "*" and origin.startswith("https://") for origin in origins)


def _readiness(settings, graph: dict, ocr: dict, rag_configured: bool) -> dict:
    cors_ready = _public_cors_ready(settings.cors_origins)
    public_links_ready = bool(settings.frontend_public_url and settings.backend_public_url)
    persistent_index_ready = settings.chroma_path.replace("\\", "/").startswith("/data/")

    checks = [
        _check(
            "openrouter",
            "OpenRouter generation",
            "ready" if rag_configured else "local",
            "OPENROUTER_API_KEY and BRIAN_AI_USE_OPENROUTER are active."
            if rag_configured
            else "Local lexical retrieval is active; add OpenRouter credentials for live generation.",
        ),
        _check(
            "vision",
            "Field vision OCR",
            "ready" if ocr.get("visionConfigured") else "local",
            "OpenRouter vision is configured for nameplate images."
            if ocr.get("visionConfigured")
            else "Nameplate OCR falls back to filename, local OCR, byte-pattern, and demo extraction.",
        ),
        _check(
            "neo4j",
            "Neo4j AuraDB graph",
            "ready" if graph.get("keepAliveEnabled") else "missing" if graph.get("configured") else "local",
            "AuraDB credentials and Python driver are available for keep-alive."
            if graph.get("keepAliveEnabled")
            else "Neo4j credentials are present but the production driver path is not active."
            if graph.get("configured")
            else "Local corpus graph is active; add AuraDB credentials for live graph storage.",
        ),
        _check(
            "cors",
            "Public CORS origins",
            "ready" if cors_ready else "missing" if settings.environment == "production" else "local",
            "ALLOW_ORIGINS is restricted to HTTPS public frontend origins."
            if cors_ready
            else "Set ALLOW_ORIGINS to the deployed Vercel URL before public submission.",
        ),
        _check(
            "persistent-index",
            "Persistent index volume",
            "ready" if persistent_index_ready else "local",
            "CHROMA_PATH points at the Railway /data volume."
            if persistent_index_ready
            else "Point CHROMA_PATH at a persistent deployment volume before live indexing.",
        ),
        _check(
            "public-links",
            "Public app links",
            "ready" if public_links_ready else "manual",
            "Frontend and backend public URLs are recorded in environment settings."
            if public_links_ready
            else "Deploy to Vercel/Railway and set FRONTEND_PUBLIC_URL and BACKEND_PUBLIC_URL.",
        ),
    ]
    return {
        "productionReady": all(check["status"] == "ready" for check in checks),
        "checks": checks,
    }


def provider_status() -> dict:
    settings = get_settings()
    rag_configured = openrouter_configured()
    graph = neo4j_status()
    ocr = ocr_status()
    return {
        "api": "ok",
        "rag": {
            "mode": "openrouter" if rag_configured else "local-lexical-rag",
            "openrouterConfigured": rag_configured,
            "modelRouting": "enabled",
        },
        "graph": graph,
        "index": {
            "mode": "sqlite-cache-seed",
            "chromaPath": settings.chroma_path,
            "cache": cache_stats(),
        },
        "ocr": ocr,
        "deployment": {
            "environment": settings.environment,
            "corsOrigins": settings.cors_origins,
            "frontendPublicUrl": settings.frontend_public_url,
            "backendPublicUrl": settings.backend_public_url,
        },
        "readiness": _readiness(settings, graph, ocr, rag_configured),
    }

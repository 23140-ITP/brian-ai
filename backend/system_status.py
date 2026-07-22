from __future__ import annotations

from config import get_settings
from database import neo4j_status
from llm.openrouter import is_configured as openrouter_configured
from ocr.nameplate import ocr_status
from vector_store import vector_stats
from workspace import current_workspace, is_demo_workspace


def _check(status_id: str, label: str, status: str, detail: str) -> dict:
    return {"id": status_id, "label": label, "status": status, "detail": detail}


def _public_cors_ready(origins: list[str]) -> bool:
    if not origins:
        return False
    return all(origin != "*" and origin.startswith("https://") for origin in origins)


def _readiness(settings, graph: dict, ocr: dict, rag_configured: bool, vectors: dict) -> dict:
    cors_ready = _public_cors_ready(settings.cors_origins)
    public_links_ready = bool(settings.frontend_public_url and settings.backend_public_url)
    vector_ready = openrouter_configured(vectors["model"]) and vectors["chunks"] > 0
    write_access_ready = bool(settings.write_token) if settings.environment.lower() == "production" else True

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
            else "Nameplate OCR uses local OCR and byte-pattern extraction. Unreadable Live images return no tag."
            if not is_demo_workspace()
            else "Nameplate OCR falls back to filename, local OCR, byte-pattern, and demo extraction.",
        ),
        _check(
            "neo4j",
            "Neo4j AuraDB graph",
            "ready" if graph.get("adapterActive") else "missing" if graph.get("configured") else "local",
            "Neo4j is storing and serving the Brian AI graph."
            if graph.get("adapterActive")
            else f"Neo4j is configured but graph sync is inactive ({graph.get('lastError') or 'not synced'})."
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
            "vector-index",
            "Vector retrieval",
            "ready" if vector_ready else "local",
            f"{vectors['chunks']} chunks are indexed with {vectors['model']}."
            if vector_ready
            else "Lexical retrieval is active until OpenRouter embeddings are configured and indexed.",
        ),
        _check(
            "write-access",
            "Protected write access",
            "ready" if write_access_ready else "missing",
            "Production ingestion requires a server-side write token."
            if write_access_ready
            else "Set BRIAN_AI_WRITE_TOKEN before exposing ingestion and knowledge capture.",
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
    vectors = vector_stats()
    return {
        "api": "ok",
        "workspace": current_workspace(),
        "readOnly": is_demo_workspace(),
        "rag": {
            "mode": "openrouter" if rag_configured else "local-lexical-rag",
            "openrouterConfigured": rag_configured,
            "modelRouting": "enabled",
        },
        "graph": graph,
        "index": {
            "mode": "openrouter-sqlite-vector" if openrouter_configured(vectors["model"]) and vectors["chunks"] else "lexical-fallback",
            "vectorPath": vectors["path"],
            "cache": vectors,
        },
        "ocr": ocr,
        "deployment": {
            "environment": settings.environment,
            "corsOrigins": settings.cors_origins,
            "frontendPublicUrl": settings.frontend_public_url,
            "backendPublicUrl": settings.backend_public_url,
        },
        "readiness": _readiness(settings, graph, ocr, rag_configured, vectors),
    }

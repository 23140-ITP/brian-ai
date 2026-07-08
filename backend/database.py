from __future__ import annotations

import asyncio
from typing import Any

from config import get_settings

HEARTBEAT_INTERVAL_SECONDS = 60 * 60
_driver: Any | None = None


def neo4j_configured() -> bool:
    settings = get_settings()
    return bool(settings.neo4j_uri and settings.neo4j_user and settings.neo4j_password)


def _async_graph_database():
    try:
        from neo4j import AsyncGraphDatabase
    except ImportError:
        return None
    return AsyncGraphDatabase


def neo4j_driver_available() -> bool:
    return _async_graph_database() is not None


def get_driver():
    global _driver
    if not neo4j_configured():
        return None
    async_graph_database = _async_graph_database()
    if async_graph_database is None:
        return None
    if _driver is None:
        settings = get_settings()
        _driver = async_graph_database.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
    return _driver


async def close_driver() -> None:
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None


async def neo4j_keepalive_once(timeout_seconds: float = 8.0) -> dict:
    driver = get_driver()
    if driver is None:
        reason = "not_configured" if not neo4j_configured() else "driver_unavailable"
        return {"ok": False, "reason": reason}

    async def run_query() -> None:
        async with driver.session() as session:
            result = await session.run(
                """
                MERGE (heartbeat:BrianAIHeartbeat {id: 'brian-ai-keepalive'})
                SET heartbeat.lastSeen = datetime()
                RETURN heartbeat.id AS id
                """
            )
            await result.consume()

    try:
        await asyncio.wait_for(run_query(), timeout=timeout_seconds)
    except Exception as exc:  # pragma: no cover - depends on external AuraDB state
        return {"ok": False, "reason": exc.__class__.__name__}
    return {"ok": True, "reason": "heartbeat_written"}


async def neo4j_keepalive_loop(interval_seconds: int = HEARTBEAT_INTERVAL_SECONDS) -> None:
    while True:
        await neo4j_keepalive_once()
        await asyncio.sleep(interval_seconds)


async def create_schema(timeout_seconds: float = 8.0) -> dict:
    driver = get_driver()
    if driver is None:
        reason = "not_configured" if not neo4j_configured() else "driver_unavailable"
        return {"ok": False, "reason": reason}

    statements = [
        "CREATE CONSTRAINT brian_ai_document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE",
        "CREATE CONSTRAINT brian_ai_equipment_tag IF NOT EXISTS FOR (e:Equipment) REQUIRE e.tag IS UNIQUE",
        "CREATE CONSTRAINT brian_ai_alert_id IF NOT EXISTS FOR (a:Alert) REQUIRE a.id IS UNIQUE",
        "CREATE CONSTRAINT brian_ai_heartbeat_id IF NOT EXISTS FOR (h:BrianAIHeartbeat) REQUIRE h.id IS UNIQUE",
    ]

    async def run_schema() -> None:
        async with driver.session() as session:
            for statement in statements:
                result = await session.run(statement)
                await result.consume()

    try:
        await asyncio.wait_for(run_schema(), timeout=timeout_seconds)
    except Exception as exc:  # pragma: no cover - depends on external AuraDB state
        return {"ok": False, "reason": exc.__class__.__name__}
    return {"ok": True, "reason": "schema_ready", "constraints": len(statements)}


def neo4j_keepalive_enabled() -> bool:
    return neo4j_configured() and neo4j_driver_available()


def neo4j_driver_initialized() -> bool:
    return _driver is not None


def neo4j_status() -> dict:
    configured = neo4j_configured()
    driver_available = neo4j_driver_available()
    keepalive_enabled = configured and driver_available
    return {
        "configured": configured,
        "driverAvailable": driver_available,
        "driverInitialized": neo4j_driver_initialized(),
        "keepAliveEnabled": keepalive_enabled,
        "heartbeatIntervalMinutes": HEARTBEAT_INTERVAL_SECONDS // 60,
        "mode": "neo4j-aura" if keepalive_enabled else "local-corpus-graph",
    }

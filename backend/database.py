from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any

from config import get_settings
from workspace import current_workspace

HEARTBEAT_INTERVAL_SECONDS = 60 * 60
_driver: Any | None = None
_last_error: dict[str, str | None] = {"demo": None, "live": None}
_last_sync_at: dict[str, str | None] = {"demo": None, "live": None}


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
        "MATCH (e:BrianAIEntity) WHERE e.workspaceId IS NULL SET e.workspaceId = 'demo'",
        "DROP CONSTRAINT brian_ai_entity_id IF EXISTS",
        "CREATE CONSTRAINT brian_ai_workspace_entity IF NOT EXISTS FOR (e:BrianAIEntity) REQUIRE (e.workspaceId, e.id) IS UNIQUE",
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


async def sync_graph_store(nodes: list[dict], edges: list[dict], timeout_seconds: float = 15.0) -> bool:
    workspace = current_workspace()
    driver = get_driver()
    if driver is None:
        return False
    node_rows = [
        {
            "id": node["id"],
            "label": node["label"],
            "type": node["type"],
            "score": node.get("score", 0),
            "details": json.dumps(node.get("details", {})),
            "workspaceId": workspace,
        }
        for node in nodes
    ]

    async def run_sync() -> None:
        async with driver.session() as session:
            statements = [
                (
                    "UNWIND $nodes AS row MERGE (n:BrianAIEntity {workspaceId: row.workspaceId, id: row.id}) "
                    "SET n.label = row.label, n.type = row.type, n.score = row.score, n.details = row.details",
                    {"nodes": node_rows},
                ),
                (
                    "MATCH (n:BrianAIEntity {workspaceId: $workspaceId}) WHERE NOT n.id IN $ids DETACH DELETE n",
                    {"workspaceId": workspace, "ids": [node["id"] for node in node_rows]},
                ),
                (
                    "MATCH (:BrianAIEntity {workspaceId: $workspaceId})-[r:BRIAN_AI_RELATION]->(:BrianAIEntity {workspaceId: $workspaceId}) DELETE r",
                    {"workspaceId": workspace},
                ),
                (
                    "UNWIND $edges AS row MATCH (source:BrianAIEntity {workspaceId: $workspaceId, id: row.source}) "
                    "MATCH (target:BrianAIEntity {workspaceId: $workspaceId, id: row.target}) "
                    "MERGE (source)-[r:BRIAN_AI_RELATION {kind: row.relationship}]->(target)",
                    {"workspaceId": workspace, "edges": edges},
                ),
            ]
            async def write_graph(transaction) -> None:
                for statement, parameters in statements:
                    result = await transaction.run(statement, parameters)
                    await result.consume()

            await session.execute_write(write_graph)

    try:
        await asyncio.wait_for(run_sync(), timeout=timeout_seconds)
    except Exception as exc:  # pragma: no cover - depends on external AuraDB state
        _last_error[workspace] = exc.__class__.__name__
        return False
    _last_error[workspace] = None
    _last_sync_at[workspace] = datetime.now(timezone.utc).isoformat()
    return True


async def load_graph_store(timeout_seconds: float = 10.0) -> tuple[list[dict], list[dict]] | None:
    workspace = current_workspace()
    driver = get_driver()
    if driver is None:
        return None

    async def run_load() -> tuple[list[dict], list[dict]]:
        async with driver.session() as session:
            async def read_graph(transaction) -> tuple[list[dict], list[dict]]:
                node_result = await transaction.run(
                    "MATCH (n:BrianAIEntity {workspaceId: $workspaceId}) "
                    "RETURN n.id AS id, n.label AS label, n.type AS type, n.score AS score, n.details AS details",
                    {"workspaceId": workspace},
                )
                node_rows = await node_result.data()
                edge_result = await transaction.run(
                    "MATCH (source:BrianAIEntity {workspaceId: $workspaceId})-[r:BRIAN_AI_RELATION]->(target:BrianAIEntity {workspaceId: $workspaceId}) "
                    "RETURN source.id AS source, target.id AS target, r.kind AS relationship",
                    {"workspaceId": workspace},
                )
                return node_rows, await edge_result.data()

            node_rows, edge_rows = await session.execute_read(read_graph)
        nodes = [
            {
                "id": row["id"],
                "label": row["label"],
                "type": row["type"],
                "score": row.get("score", 0),
                "details": json.loads(row.get("details") or "{}"),
            }
            for row in node_rows
        ]
        return nodes, [dict(row) for row in edge_rows]

    try:
        graph = await asyncio.wait_for(run_load(), timeout=timeout_seconds)
    except Exception as exc:  # pragma: no cover - depends on external AuraDB state
        _last_error[workspace] = exc.__class__.__name__
        return None
    _last_error[workspace] = None
    return graph


def neo4j_keepalive_enabled() -> bool:
    return neo4j_configured() and neo4j_driver_available()


def neo4j_driver_initialized() -> bool:
    return _driver is not None


def neo4j_status() -> dict:
    workspace = current_workspace()
    configured = neo4j_configured()
    driver_available = neo4j_driver_available()
    keepalive_enabled = configured and driver_available
    adapter_active = bool(_last_sync_at[workspace] and not _last_error[workspace])
    return {
        "configured": configured,
        "driverAvailable": driver_available,
        "driverInitialized": neo4j_driver_initialized(),
        "keepAliveEnabled": keepalive_enabled,
        "adapterActive": adapter_active,
        "lastSyncAt": _last_sync_at[workspace],
        "lastError": _last_error[workspace],
        "workspace": workspace,
        "heartbeatIntervalMinutes": HEARTBEAT_INTERVAL_SECONDS // 60,
        "mode": "neo4j-aura" if adapter_active else "local-corpus-graph",
    }

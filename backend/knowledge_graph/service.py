from __future__ import annotations

from collections import defaultdict, deque

from database import load_graph_store, neo4j_status, sync_graph_store
from graph_builder import build_graph
from mock_data import GRAPH_EDGES, GRAPH_NODES, completeness


async def _graph() -> tuple[list[dict], list[dict]]:
    stored = await load_graph_store() if neo4j_status()["adapterActive"] else None
    if stored and stored[0]:
        return stored
    nodes, edges = build_graph()
    return (nodes or GRAPH_NODES, edges or GRAPH_EDGES)


async def refresh_graph_store() -> bool:
    nodes, edges = build_graph()
    return await sync_graph_store(nodes, edges)


async def graph_nodes() -> list[dict]:
    nodes, _ = await _graph()
    return nodes


async def graph_edges() -> list[dict]:
    _, edges = await _graph()
    return edges


async def completeness_score() -> dict:
    nodes, edges = await _graph()
    equipment = {node["id"] for node in nodes if node["type"] == "Equipment"}
    linked = {edge["source"] for edge in edges if edge["source"] in equipment} | {edge["target"] for edge in edges if edge["target"] in equipment}
    if not equipment:
        return completeness()
    return {
        "totalTags": len(equipment),
        "linkedTags": len(linked),
        "score": round(len(linked) / len(equipment), 3),
        "nodes": len(nodes),
        "edges": len(edges),
    }


async def query_graph(source: str, target_type: str = "Regulation") -> list[dict]:
    nodes, edges = await _graph()

    node_by_id = {node["id"]: node for node in nodes}
    if source not in node_by_id:
        return []

    adjacency: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for edge in edges:
        adjacency[edge["source"]].append((edge["target"], edge["relationship"]))
        adjacency[edge["target"]].append((edge["source"], edge["relationship"]))

    queue = deque([(source, [source], [])])
    visited = {source}
    paths: list[dict] = []

    while queue and len(paths) < 3:
        current, node_path, relationships = queue.popleft()
        current_node = node_by_id[current]
        if current != source and current_node["type"].lower() == target_type.lower():
            paths.append(
                {
                    "source": source,
                    "target": current,
                    "targetType": current_node["type"],
                    "depth": len(relationships),
                    "path": [
                        {"id": node_id, "label": node_by_id[node_id]["label"], "type": node_by_id[node_id]["type"]}
                        for node_id in node_path
                    ],
                    "relationships": relationships,
                }
            )
            continue

        for neighbor, relationship in adjacency[current]:
            if neighbor in visited or neighbor not in node_by_id:
                continue
            visited.add(neighbor)
            queue.append((neighbor, [*node_path, neighbor], [*relationships, relationship]))

    if paths:
        return paths

    return [
        {
            "source": source,
            "target": neighbor,
            "targetType": node_by_id[neighbor]["type"],
            "depth": 1,
            "path": [
                {"id": source, "label": node_by_id[source]["label"], "type": node_by_id[source]["type"]},
                {"id": neighbor, "label": node_by_id[neighbor]["label"], "type": node_by_id[neighbor]["type"]},
            ],
            "relationships": [relationship],
        }
        for neighbor, relationship in adjacency[source][:3]
    ]

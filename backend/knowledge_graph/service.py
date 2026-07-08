from __future__ import annotations

from collections import defaultdict, deque

from graph_builder import build_graph, graph_completeness
from mock_data import GRAPH_EDGES, GRAPH_NODES, completeness


def graph_nodes() -> list[dict]:
    nodes, _ = build_graph()
    return nodes or GRAPH_NODES


def graph_edges() -> list[dict]:
    _, edges = build_graph()
    return edges or GRAPH_EDGES


def completeness_score() -> dict:
    result = graph_completeness()
    return result if result["totalTags"] else completeness()


def query_graph(source: str, target_type: str = "Regulation") -> list[dict]:
    nodes, edges = build_graph()
    if not nodes:
        nodes, edges = GRAPH_NODES, GRAPH_EDGES

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

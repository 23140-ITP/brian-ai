from __future__ import annotations

import re
from collections import Counter, defaultdict

from compliance.checker import compliance_results
from corpus_catalog import list_documents
from corpus_search import load_corpus
from mock_data import ALERTS, COMPLIANCE_RESULTS
from pattern_detector import detect_alerts
from workspace import is_demo_workspace


EQUIPMENT_RE = re.compile(r"\b(?:P|HE|V|K|T)-\d+[A-Z]?\b")


def doc_label(filename: str) -> str:
    return filename.replace(".pdf", "").replace(".csv", "")


def document_type(filename: str) -> str:
    for document in list_documents():
        if document["filename"] == filename:
            return document["docType"]
    return "Document"


def build_graph() -> tuple[list[dict], list[dict]]:
    demo = is_demo_workspace()
    clauses = COMPLIANCE_RESULTS if demo else compliance_results()
    alerts = ALERTS if demo else detect_alerts()
    equipment_mentions: Counter[str] = Counter()
    doc_mentions: dict[str, set[str]] = defaultdict(set)
    regulation_mentions: dict[str, set[str]] = defaultdict(set)
    expert_mentions: dict[str, set[str]] = defaultdict(set)

    for chunk in load_corpus():
        tags = set(EQUIPMENT_RE.findall(chunk.text))
        for tag in tags:
            equipment_mentions[tag] += 1
            doc_mentions[chunk.filename].add(tag)
        expert_match = re.search(r"^Expert:\s*(.+)$", chunk.text, re.IGNORECASE)
        if expert_match:
            expert_mentions[chunk.filename].add(expert_match.group(1).strip())
        for clause in clauses:
            if clause["clauseId"].lower() in chunk.text.lower() or clause["title"].lower().split(" - ")[0] in chunk.text.lower():
                regulation_mentions[clause["clauseId"]].add(chunk.filename)

    nodes: dict[str, dict] = {}
    for tag, count in equipment_mentions.items():
        nodes[tag] = {
            "id": tag,
            "label": tag,
            "type": "Equipment",
            "score": min(10, 3 + count),
            "details": {
                "mentions": str(count),
                "health": "Watchlist" if any(alert["tag"] == tag for alert in alerts) else "Normal",
            },
        }

    for document in list_documents():
        filename = document["filename"]
        nodes[filename] = {
            "id": filename,
            "label": doc_label(filename),
            "type": "Document",
            "score": 3,
            "details": {"docType": document["docType"], "chunks": str(document["chunks"])},
        }

    for clause in clauses:
        nodes[clause["clauseId"]] = {
            "id": clause["clauseId"],
            "label": clause["clauseId"],
            "type": "Regulation",
            "score": 4,
            "details": {"title": clause["title"], "status": clause["status"]},
        }

    for alert in alerts:
        nodes[alert["id"]] = {
            "id": alert["id"],
            "label": alert["tag"],
            "type": "Alert",
            "score": 5 if alert["severity"] == "HIGH" else 3,
            "details": {"severity": alert["severity"], "message": alert["message"]},
        }

    if demo:
        nodes["A-Rao"] = {
            "id": "A-Rao",
            "label": "A. Rao",
            "type": "Person",
            "score": 2,
            "details": {"role": "Maintenance expert", "tenure": "31 years"},
        }
    else:
        for experts in expert_mentions.values():
            for expert in experts:
                expert_id = "expert-" + re.sub(r"[^a-z0-9]+", "-", expert.lower()).strip("-")
                nodes[expert_id] = {"id": expert_id, "label": expert, "type": "Person", "score": 2, "details": {"role": "Knowledge contributor"}}

    edges: list[dict] = []
    seen: set[tuple[str, str, str]] = set()

    def add_edge(source: str, target: str, relationship: str) -> None:
        if source in nodes and target in nodes and (source, target, relationship) not in seen:
            seen.add((source, target, relationship))
            edges.append({"source": source, "target": target, "relationship": relationship})

    for filename, tags in doc_mentions.items():
        for tag in tags:
            add_edge(tag, filename, "MENTIONED_IN")

    for clause_id, filenames in regulation_mentions.items():
        for filename in filenames:
            add_edge(clause_id, filename, "EVIDENCED_BY")

    if demo:
        add_edge("P-204B", "alert-p204b", "TRIGGERS")
        add_edge("V-301", "alert-v301", "TRIGGERS")
        add_edge("HE-101", "alert-he101", "TRIGGERS")
        add_edge("P-204B", "A-Rao", "MAINTAINED_BY")
        add_edge("P-204B", "OISD-116-4.2", "GOVERNED_BY")
        add_edge("V-301", "PESO-PV-8", "GOVERNED_BY")
    else:
        for alert in alerts:
            add_edge(alert["tag"], alert["id"], "TRIGGERS")
        for filename, experts in expert_mentions.items():
            for expert in experts:
                expert_id = "expert-" + re.sub(r"[^a-z0-9]+", "-", expert.lower()).strip("-")
                add_edge(filename, expert_id, "CAPTURED_FROM")
        for clause in clauses:
            for tag in EQUIPMENT_RE.findall(clause.get("plantEvidence", "")):
                add_edge(tag, clause["clauseId"], "GOVERNED_BY")

    return list(nodes.values()), edges


def graph_completeness() -> dict:
    nodes, edges = build_graph()
    equipment_count = sum(1 for node in nodes if node["type"] == "Equipment")
    linked_equipment = {
        edge["source"]
        for edge in edges
        if any(node["id"] == edge["source"] and node["type"] == "Equipment" for node in nodes)
    }
    score = len(linked_equipment) / equipment_count if equipment_count else 0
    return {
        "totalTags": equipment_count,
        "linkedTags": len(linked_equipment),
        "score": round(score, 3),
        "nodes": len(nodes),
        "edges": len(edges),
    }

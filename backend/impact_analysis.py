from __future__ import annotations

import re
from pathlib import Path

from compliance.checker import compliance_results
from corpus_catalog import list_documents
from corpus_search import read_text, search
from graph_builder import build_graph
from ingestion.entity_extractor import extract_entities
from pattern_detector import detect_alerts
from workspace import corpus_dir


SIGNALS = {
    "Vibration or alignment": ("vibration", "alignment", "bearing", "imbalance"),
    "Seal or leakage": ("seal", "leak", "gasket", "packing"),
    "Corrosion or wall loss": ("corrosion", "thickness", "wall loss", "pitting"),
    "Thermal excursion": ("temperature", "overheat", "thermal", "hot spot"),
}
FILENAME_EQUIPMENT_RE = re.compile(r"\b(HE|P|V|K|T)-?(\d+[A-Z]?)\b", re.IGNORECASE)


def _source_path(filename: str) -> Path:
    if not filename or Path(filename).name != filename:
        raise FileNotFoundError(filename)
    path = corpus_dir() / filename
    if not path.is_file() or filename not in {row["filename"] for row in list_documents()}:
        raise FileNotFoundError(filename)
    return path


def _excerpt(text: str, limit: int = 220) -> str:
    clean = " ".join(text.split())
    return clean if len(clean) <= limit else clean[: limit - 1].rstrip() + "..."


def _facts(text: str, entity_ids: set[str]) -> list[str]:
    candidates = re.split(r"(?<=[.!?])\s+|[\r\n]+", text)
    keywords = {word for words in SIGNALS.values() for word in words}
    selected = [
        _excerpt(candidate)
        for candidate in candidates
        if candidate.strip()
        and (any(entity in candidate for entity in entity_ids) or any(word in candidate.lower() for word in keywords))
    ]
    return list(dict.fromkeys(selected))[:4]


def build_impact_receipt(filename: str, text: str | None = None, entities: list[dict] | None = None) -> dict:
    path = _source_path(filename)
    source_text = text if text is not None else read_text(path)
    extracted = entities if entities is not None else extract_entities(source_text)
    known_ids = {entity["id"] for entity in extracted}
    for prefix, suffix in FILENAME_EQUIPMENT_RE.findall(path.stem):
        tag = f"{prefix.upper()}-{suffix.upper()}"
        if tag not in known_ids:
            extracted.append({"type": "Equipment", "id": tag, "properties": {"tag": tag, "source": "filename"}})
            known_ids.add(tag)
    equipment = [entity["id"] for entity in extracted if entity["type"] == "Equipment"]
    regulations = [entity["id"] for entity in extracted if entity["type"] == "Regulation"]
    entity_ids = set(equipment + regulations)

    query = " ".join([*equipment, *[word for word in SIGNALS if word.lower() in source_text.lower()]]) or path.stem
    matches = search(query, limit=10)
    timeline = []
    for match in matches:
        row = {"filename": match.filename, "excerpt": _excerpt(match.text), "isNewEvidence": match.filename == filename}
        if row not in timeline:
            timeline.append(row)
    timeline = timeline[:6]
    related_sources = list(dict.fromkeys(row["filename"] for row in timeline if row["filename"] != filename))

    detected_signals = [label for label, words in SIGNALS.items() if any(word in source_text.lower() for word in words)]
    hypotheses = []
    if related_sources and equipment:
        hypotheses.append({
            "title": "Recurring equipment condition",
            "confidence": min(0.9, 0.62 + 0.06 * len(related_sources)),
            "basis": f"{equipment[0]} appears in the new evidence and {len(related_sources)} other corpus source(s).",
            "evidence": [filename, *related_sources[:3]],
            "classification": "inference",
        })
    for signal in detected_signals[:2]:
        hypotheses.append({
            "title": signal,
            "confidence": 0.72 if related_sources else 0.48,
            "basis": f"The uploaded evidence contains terms associated with {signal.lower()}; engineering validation is required.",
            "evidence": [filename, *related_sources[:2]],
            "classification": "inference",
        })
    if not hypotheses:
        hypotheses.append({
            "title": "Insufficient evidence for root-cause inference",
            "confidence": 0.2,
            "basis": "The document was indexed, but it does not contain enough failure signals or linked history for an RCA hypothesis.",
            "evidence": [filename],
            "classification": "insufficient-evidence",
        })

    rows = compliance_results()
    compliance_impacts = [
        {
            "clauseId": row["clauseId"],
            "title": row["title"],
            "status": row["status"],
            "confidence": row["confidence"],
            "remediation": row["remediation"],
        }
        for row in rows
        if row["clauseId"] in regulations or filename.lower() in row.get("plantEvidence", "").lower()
    ][:4]

    alerts = [alert for alert in detect_alerts() if alert["tag"] in equipment]
    nodes, edges = build_graph()
    graph_links = [edge for edge in edges if filename in (edge["source"], edge["target"])]
    linked_node_ids = {
        edge["target"] if edge["source"] == filename else edge["source"]
        for edge in graph_links
    }
    touched_nodes = [node for node in nodes if node["id"] in linked_node_ids]

    actions = ["Validate extracted entities and RCA hypotheses with the responsible engineer before execution."]
    if detected_signals:
        actions.append(f"Inspect {equipment[0] if equipment else 'the affected asset'} for {detected_signals[0].lower()} indicators.")
    if compliance_impacts:
        actions.append(f"Review {compliance_impacts[0]['clauseId']} and attach approved evidence before closing the action.")
    if alerts:
        actions.append("Escalate the recurring pattern through the maintenance and reliability workflow.")

    facts = _facts(source_text, entity_ids)
    if not facts:
        facts = [row["excerpt"] for row in timeline if row["isNewEvidence"]][:2]

    return {
        "document": {"filename": filename, "docType": next((row["docType"] for row in list_documents() if row["filename"] == filename), "Document")},
        "entities": [{**entity, "confidence": 0.98} for entity in extracted],
        "facts": facts,
        "graphChanges": {
            "relationshipsAdded": len(graph_links),
            "linkedNodes": [{"id": node["id"], "label": node["label"], "type": node["type"]} for node in touched_nodes[:8]],
            "links": graph_links[:8],
        },
        "alerts": alerts,
        "complianceImpacts": compliance_impacts,
        "rca": {"hypotheses": hypotheses, "timeline": timeline},
        "recommendedActions": actions,
        "questionsUnlocked": [
            f"What changed for {tag} after {filename}?" for tag in equipment[:2]
        ] or [f"What operational evidence was added by {filename}?"],
        "provenance": {
            "newEvidence": filename,
            "relatedSources": related_sources,
            "method": "Deterministic entity extraction, corpus retrieval, graph linkage, and rule-based hypothesis ranking",
        },
    }

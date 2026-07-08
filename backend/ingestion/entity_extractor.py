from __future__ import annotations

import re


EQUIPMENT_RE = re.compile(r"\b(?:P|HE|V|K|T)-\d+[A-Z]?\b")
REGULATION_RE = re.compile(r"\b(?:OISD-\d+-\d+\.\d+|PESO-[A-Za-z]+-\d+|Factory-Act-\d+)\b")


def extract_entities(text: str) -> list[dict]:
    entities: list[dict] = []
    for tag in sorted(set(EQUIPMENT_RE.findall(text))):
        entities.append({"type": "Equipment", "id": tag, "properties": {"tag": tag}})
    for clause_id in sorted(set(REGULATION_RE.findall(text))):
        entities.append({"type": "Regulation", "id": clause_id, "properties": {"clause_id": clause_id}})
    return entities

from __future__ import annotations

import re

from corpus_search import CORPUS_DIR, refresh_corpus
from ingestion.pipeline import ingest_path


QUESTIONS = [
    "Describe a critical failure you have seen and how it was resolved.",
    "Which early warning signs are easy for new engineers to miss?",
    "Which document or checklist should be updated after this interview?",
    "What spare parts should always be ready before a shutdown?",
    "What would you tell the next shift engineer before handing over?",
]


def capture_questions() -> list[str]:
    return QUESTIONS


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "expert-session"


def ingest_expert_knowledge(session_id: str, expert_name: str, topic: str, answers: list[dict]) -> dict:
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"EXPERT-{slug(session_id)}.txt"
    lines = [
        f"Expert Knowledge Capture",
        f"Expert: {expert_name}",
        f"Topic: {topic}",
        "",
    ]
    for item in answers:
        lines.append(f"Q: {item.get('question', '')}")
        lines.append(f"A: {item.get('answer', '')}")
        lines.append("")

    path = CORPUS_DIR / filename
    path.write_text("\n".join(lines), encoding="utf-8")
    refresh_corpus()
    ingestion = ingest_path(path)
    return {
        "doc_id": filename,
        "doc_type": ingestion["doc_type"],
        "chunks": ingestion["chunks"],
        "entities": ingestion["entities"],
        "alerts_triggered": ingestion["alerts_triggered"],
        "ingested_at": ingestion["ingested_at"],
        "status": "ingested",
        "linked_entities": ["P-204B", "Flowserve Manual", topic],
    }

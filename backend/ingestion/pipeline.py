from __future__ import annotations

import asyncio
from datetime import datetime
import json
from pathlib import Path

from corpus_search import CORPUS_DIR, read_text, refresh_corpus, split_chunks
from ingestion.document_classifier import classify_document
from ingestion.embedding_cache import get_or_create_embedding
from ingestion.entity_extractor import extract_entities
from pattern_detector import detect_alerts


INGEST_STEPS = [
    "Extracting text",
    "Chunking",
    "Embedding with cache",
    "Extracting entities",
    "Running pattern detection",
]


def save_upload(filename: str, content: bytes) -> Path:
    safe_name = Path(filename or "uploaded-document.txt").name
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    destination = CORPUS_DIR / safe_name
    destination.write_bytes(content)
    return destination


def ingest_text(path: Path, text: str) -> dict:
    chunks = split_chunks(path.name, text)
    cache_hits = 0
    for chunk in chunks:
        _, hit = get_or_create_embedding(chunk.text, path.name)
        cache_hits += int(hit)

    refresh_corpus()
    entities = extract_entities(text)
    alerts = detect_alerts()
    return {
        "doc_id": path.name,
        "doc_type": classify_document(path.name),
        "chunks": len(chunks),
        "entities": len(entities),
        "alerts_triggered": len(alerts),
        "cache_hits": cache_hits,
        "ingested_at": datetime.utcnow().isoformat() + "Z",
    }


def ingest_path(path: Path) -> dict:
    text = read_text(path)
    return ingest_text(path, text)


def save_and_ingest(filename: str, content: bytes) -> dict:
    destination = save_upload(filename, content)
    return ingest_path(destination)


async def stream_save_and_ingest(filename: str, content: bytes):
    destination = save_upload(filename, content)
    total = len(INGEST_STEPS)

    text = read_text(destination)
    yield {"event": "progress", "data": {"current": 1, "total": total, "step": INGEST_STEPS[0], "filename": destination.name}}
    await asyncio.sleep(0.02)

    chunks = split_chunks(destination.name, text)
    yield {"event": "progress", "data": {"current": 2, "total": total, "step": INGEST_STEPS[1], "chunks": len(chunks)}}
    await asyncio.sleep(0.02)

    cache_hits = 0
    for chunk in chunks:
        _, hit = get_or_create_embedding(chunk.text, destination.name)
        cache_hits += int(hit)
    yield {"event": "progress", "data": {"current": 3, "total": total, "step": INGEST_STEPS[2], "cache_hits": cache_hits}}
    await asyncio.sleep(0.02)

    refresh_corpus()
    entities = extract_entities(text)
    yield {"event": "progress", "data": {"current": 4, "total": total, "step": INGEST_STEPS[3], "entities": len(entities)}}
    await asyncio.sleep(0.02)

    alerts = detect_alerts()
    yield {"event": "progress", "data": {"current": 5, "total": total, "step": INGEST_STEPS[4], "alerts": len(alerts)}}

    response = {
        "doc_id": destination.name,
        "doc_type": classify_document(destination.name),
        "chunks": len(chunks),
        "entities": len(entities),
        "alerts_triggered": len(alerts),
        "cache_hits": cache_hits,
        "ingested_at": datetime.utcnow().isoformat() + "Z",
    }
    yield {"event": "done", "data": response}


async def stream_ingest_events(filename: str, content: bytes):
    async for payload in stream_save_and_ingest(filename, content):
        yield f"event: {payload['event']}\ndata: {json.dumps(payload['data'])}\n\n"

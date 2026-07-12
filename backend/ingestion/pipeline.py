from __future__ import annotations

import asyncio
from datetime import datetime
import json
from pathlib import Path

from corpus_search import read_text, refresh_corpus, split_chunks
from ingestion.document_classifier import classify_document
from ingestion.entity_extractor import extract_entities
from pattern_detector import detect_alerts
from vector_store import index_chunks
from workspace import corpus_dir


INGEST_STEPS = [
    "Extracting text",
    "Chunking",
    "Indexing vectors",
    "Extracting entities",
    "Running pattern detection",
]


class DocumentAlreadyExistsError(Exception):
    pass


def save_upload(filename: str, content: bytes) -> Path:
    safe_name = Path(filename or "uploaded-document.txt").name
    destination_dir = corpus_dir()
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination = destination_dir / safe_name
    try:
        with destination.open("xb") as handle:
            handle.write(content)
    except FileExistsError as exc:
        raise DocumentAlreadyExistsError(f"{safe_name} already exists in this workspace.") from exc
    return destination


def ingest_text(path: Path, text: str) -> dict:
    chunks = split_chunks(path.name, text)
    vector_result = index_chunks(chunks)

    refresh_corpus()
    entities = extract_entities(text)
    alerts = detect_alerts()
    return {
        "doc_id": path.name,
        "doc_type": classify_document(path.name),
        "chunks": len(chunks),
        "entities": len(entities),
        "alerts_triggered": len(alerts),
        "cache_hits": vector_result["cache_hits"],
        "vectors_indexed": vector_result["indexed"],
        "ingested_at": datetime.utcnow().isoformat() + "Z",
    }


def ingest_path(path: Path) -> dict:
    text = read_text(path)
    return ingest_text(path, text)


def save_and_ingest(filename: str, content: bytes) -> dict:
    destination = save_upload(filename, content)
    return ingest_path(destination)


async def stream_save_and_ingest(filename: str, content: bytes):
    try:
        destination = save_upload(filename, content)
    except DocumentAlreadyExistsError as exc:
        yield {"event": "error", "data": {"code": "DUPLICATE_DOCUMENT", "detail": str(exc)}}
        return
    total = len(INGEST_STEPS)

    text = read_text(destination)
    yield {"event": "progress", "data": {"current": 1, "total": total, "step": INGEST_STEPS[0], "filename": destination.name}}
    await asyncio.sleep(0.02)

    chunks = split_chunks(destination.name, text)
    yield {"event": "progress", "data": {"current": 2, "total": total, "step": INGEST_STEPS[1], "chunks": len(chunks)}}
    await asyncio.sleep(0.02)

    vector_result = await asyncio.to_thread(index_chunks, chunks)
    yield {"event": "progress", "data": {"current": 3, "total": total, "step": INGEST_STEPS[2], **vector_result}}
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
        "cache_hits": vector_result["cache_hits"],
        "vectors_indexed": vector_result["indexed"],
        "ingested_at": datetime.utcnow().isoformat() + "Z",
    }
    yield {"event": "done", "data": response}


async def stream_ingest_events(filename: str, content: bytes):
    async for payload in stream_save_and_ingest(filename, content):
        yield f"event: {payload['event']}\ndata: {json.dumps(payload['data'])}\n\n"

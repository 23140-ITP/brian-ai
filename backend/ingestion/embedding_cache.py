from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path

from corpus_search import DATA_DIR


CACHE_PATH = DATA_DIR / "cache.db"


def _connect() -> sqlite3.Connection:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(CACHE_PATH)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS embedding_cache (
            chunk_sha TEXT PRIMARY KEY,
            source_file TEXT NOT NULL,
            token_count INTEGER NOT NULL,
            embedding_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    return connection


def chunk_sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()


def deterministic_embedding(text: str, dimensions: int = 16) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8", errors="ignore")).digest()
    return [round(digest[index] / 255, 6) for index in range(dimensions)]


def get_or_create_embedding(text: str, source_file: str) -> tuple[str, bool]:
    key = chunk_sha(text)
    with _connect() as connection:
        row = connection.execute(
            "SELECT chunk_sha FROM embedding_cache WHERE chunk_sha = ?",
            (key,),
        ).fetchone()
        if row:
            return key, True

        token_count = len(text.split())
        connection.execute(
            """
            INSERT INTO embedding_cache (chunk_sha, source_file, token_count, embedding_json)
            VALUES (?, ?, ?, ?)
            """,
            (key, source_file, token_count, json.dumps(deterministic_embedding(text))),
        )
        return key, False


def cache_stats() -> dict:
    with _connect() as connection:
        rows = connection.execute(
            "SELECT COUNT(*) AS chunks, COUNT(DISTINCT source_file) AS files FROM embedding_cache"
        ).fetchone()
    return {"chunks": rows[0], "files": rows[1], "path": str(CACHE_PATH)}

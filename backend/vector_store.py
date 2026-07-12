from __future__ import annotations

import hashlib
import json
import math
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Callable

from config import get_settings
from corpus_search import Chunk, tokenize
from llm.openrouter import generate_embeddings
from workspace import data_dir


EmbeddingFunction = Callable[[list[str]], list[list[float]] | None]


def _cosine(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        return -1.0
    denominator = math.sqrt(sum(value * value for value in left)) * math.sqrt(sum(value * value for value in right))
    return sum(a * b for a, b in zip(left, right)) / denominator if denominator else -1.0


class SQLiteVectorStore:
    def __init__(self, path: Path, model: str, embed: EmbeddingFunction):
        self.path = Path(path)
        self.model = model
        self.embed = embed

    def _connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path)
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS vectors (
                chunk_sha TEXT NOT NULL,
                model TEXT NOT NULL,
                source_file TEXT NOT NULL,
                chunk_text TEXT NOT NULL,
                embedding_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (chunk_sha, model)
            )
            """
        )
        return connection

    def index(self, chunks: list[Chunk]) -> dict:
        keys = [hashlib.sha256(chunk.text.encode("utf-8", errors="ignore")).hexdigest() for chunk in chunks]
        with closing(self._connect()) as connection:
            existing = {
                row[0]
                for row in connection.execute(
                    "SELECT chunk_sha FROM vectors WHERE model = ?",
                    (self.model,),
                )
            }
            missing = [(key, chunk) for key, chunk in zip(keys, chunks) if key not in existing]
            indexed = 0
            for offset in range(0, len(missing), 32):
                batch = missing[offset:offset + 32]
                vectors = self.embed([chunk.text for _, chunk in batch])
                if not vectors or len(vectors) != len(batch):
                    break
                connection.executemany(
                    "INSERT OR REPLACE INTO vectors (chunk_sha, model, source_file, chunk_text, embedding_json) VALUES (?, ?, ?, ?, ?)",
                    [
                        (key, self.model, chunk.filename, chunk.text, json.dumps(vector))
                        for (key, chunk), vector in zip(batch, vectors)
                    ],
                )
                indexed += len(batch)
            connection.commit()
        return {"chunks": len(chunks), "cache_hits": len(chunks) - len(missing), "indexed": indexed}

    def search(self, query: str, limit: int = 5, source_file: str | None = None) -> list[Chunk]:
        vectors = self.embed([query])
        if not vectors:
            return []
        query_vector = vectors[0]
        with closing(self._connect()) as connection:
            if source_file:
                rows = connection.execute(
                    "SELECT source_file, chunk_text, embedding_json FROM vectors WHERE model = ? AND source_file = ?",
                    (self.model, source_file),
                ).fetchall()
            else:
                rows = connection.execute(
                    "SELECT source_file, chunk_text, embedding_json FROM vectors WHERE model = ?",
                    (self.model,),
                ).fetchall()
        ranked = sorted(
            ((_cosine(query_vector, json.loads(embedding)), filename, text) for filename, text, embedding in rows),
            key=lambda row: row[0],
            reverse=True,
        )
        return [Chunk(filename, text, frozenset(tokenize(text))) for score, filename, text in ranked[:limit] if score > 0]

    def stats(self) -> dict:
        with closing(self._connect()) as connection:
            row = connection.execute(
                "SELECT COUNT(*), COUNT(DISTINCT source_file) FROM vectors WHERE model = ?",
                (self.model,),
            ).fetchone()
        return {"chunks": row[0], "files": row[1], "path": str(self.path), "model": self.model}


def _default_store() -> SQLiteVectorStore:
    settings = get_settings()
    return SQLiteVectorStore(data_dir() / "vectors.db", settings.openrouter_embedding_model, generate_embeddings)


def index_chunks(chunks: list[Chunk]) -> dict:
    return _default_store().index(chunks)


def semantic_search(query: str, limit: int = 5, source_file: str | None = None) -> list[Chunk]:
    return _default_store().search(query, limit, source_file)


def vector_stats() -> dict:
    return _default_store().stats()

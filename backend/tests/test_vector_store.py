from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from corpus_search import Chunk  # noqa: E402
from vector_store import SQLiteVectorStore  # noqa: E402
from llm.openrouter import generate_embeddings  # noqa: E402


class VectorStoreTests(unittest.TestCase):
    def test_semantic_search_uses_persisted_vectors(self) -> None:
        vectors = {
            "pump seal evidence": [1.0, 0.0],
            "tank inspection evidence": [0.0, 1.0],
            "seal failure": [0.9, 0.1],
        }

        def embed(texts: list[str]) -> list[list[float]]:
            return [vectors[text] for text in texts]

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "vectors.db"
            store = SQLiteVectorStore(path, "test-model", embed)
            store.index(
                [
                    Chunk("pump.txt", "pump seal evidence", frozenset({"pump", "seal", "evidence"})),
                    Chunk("tank.txt", "tank inspection evidence", frozenset({"tank", "inspection", "evidence"})),
                ]
            )

            reopened = SQLiteVectorStore(path, "test-model", embed)
            matches = reopened.search("seal failure", limit=1)
            scoped_matches = reopened.search("seal failure", limit=1, source_file="tank.txt")

        self.assertEqual([match.filename for match in matches], ["pump.txt"])
        self.assertEqual([match.filename for match in scoped_matches], ["tank.txt"])

    def test_openrouter_embedding_rows_are_ordered_by_index(self) -> None:
        with (
            patch("llm.openrouter.is_configured", return_value=True),
            patch(
                "llm.openrouter._request",
                return_value={
                    "data": [
                        {"index": 1, "embedding": [0.0, 1.0]},
                        {"index": 0, "embedding": [1.0, 0.0]},
                    ]
                },
            ),
        ):
            self.assertEqual(generate_embeddings(["first", "second"]), [[1.0, 0.0], [0.0, 1.0]])


if __name__ == "__main__":
    unittest.main()

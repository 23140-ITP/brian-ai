from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch


BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from corpus_search import Chunk  # noqa: E402
from vector_store import SQLiteVectorStore  # noqa: E402
from llm.openrouter import _request, generate_embeddings, is_configured  # noqa: E402


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

    def test_openrouter_request_rejects_paid_models(self) -> None:
        with patch("llm.openrouter.urllib.request.urlopen") as urlopen:
            self.assertIsNone(_request("chat/completions", {"model": "openai/gpt-4o-mini"}, 1))
        urlopen.assert_not_called()

    def test_openrouter_request_allows_free_models(self) -> None:
        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"choices": []}'
        for model in ("openrouter/free", "vendor/model:free"):
            with self.subTest(model=model), patch("llm.openrouter.urllib.request.urlopen", return_value=response) as urlopen:
                self.assertEqual(_request("chat/completions", {"model": model}, 1), {"choices": []})
            urlopen.assert_called_once()

    def test_blank_embedding_model_uses_lexical_fallback(self) -> None:
        with (
            patch("llm.openrouter.is_configured", return_value=True),
            patch("llm.openrouter.get_settings", return_value=SimpleNamespace(openrouter_embedding_model="")),
            patch("llm.openrouter.urllib.request.urlopen") as urlopen,
        ):
            self.assertIsNone(generate_embeddings(["pump seal evidence"]))
        urlopen.assert_not_called()

    def test_provider_readiness_requires_a_free_model(self) -> None:
        settings = SimpleNamespace(openrouter_api_key="test-key", use_openrouter=True)
        with patch("llm.openrouter.get_settings", return_value=settings):
            self.assertTrue(is_configured("openrouter/free"))
            self.assertTrue(is_configured("vendor/model:free"))
            self.assertFalse(is_configured("google/gemini-2.5-flash"))


if __name__ == "__main__":
    unittest.main()

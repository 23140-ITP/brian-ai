from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from config import get_settings  # noqa: E402
from corpus_catalog import CorpusCatalog  # noqa: E402
import corpus_catalog  # noqa: E402
import ingestion.pipeline as ingestion_pipeline  # noqa: E402
from main import app  # noqa: E402
from request_guard import reset_rate_limits  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402


class RequestGuardTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_rate_limits()
        get_settings.cache_clear()

    def tearDown(self) -> None:
        get_settings.cache_clear()

    def test_production_ingest_requires_write_token(self) -> None:
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "BRIAN_AI_WRITE_TOKEN": "test-secret"}, clear=False):
            get_settings.cache_clear()
            with TestClient(app) as client:
                response = client.post(
                    "/api/ingest",
                    files={"file": ("safe.txt", b"safe", "text/plain")},
                )
        self.assertEqual(response.status_code, 401)

    def test_oversized_upload_is_rejected_before_ingest(self) -> None:
        with patch.dict(
            os.environ,
            {
                "ENVIRONMENT": "production",
                "BRIAN_AI_WRITE_TOKEN": "test-secret",
                "BRIAN_AI_MAX_DOCUMENT_BYTES": "4",
            },
            clear=False,
        ):
            get_settings.cache_clear()
            with TestClient(app) as client:
                response = client.post(
                    "/api/ingest",
                    headers={"X-Brian-Write-Token": "test-secret"},
                    files={"file": ("safe.txt", b"12345", "text/plain")},
                )
        self.assertEqual(response.status_code, 413)

    def test_authenticated_production_ingest_remains_available(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            corpus_dir = Path(directory) / "corpus"
            replacement_catalog = CorpusCatalog(corpus_dir)
            with (
                patch.dict(os.environ, {"ENVIRONMENT": "production", "BRIAN_AI_WRITE_TOKEN": "test-secret"}, clear=False),
                patch.object(ingestion_pipeline, "CORPUS_DIR", corpus_dir),
                patch.object(corpus_catalog, "catalog", replacement_catalog),
            ):
                get_settings.cache_clear()
                with TestClient(app) as client:
                    response = client.post(
                        "/api/ingest",
                        headers={"X-Brian-Write-Token": "test-secret"},
                        files={"file": ("inspection.txt", b"P-204B inspection evidence", "text/plain")},
                    )

            self.assertEqual(response.status_code, 200)
            self.assertEqual(replacement_catalog.list_documents()[0]["filename"], "inspection.txt")

    def test_authenticated_unsupported_upload_is_rejected(self) -> None:
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "BRIAN_AI_WRITE_TOKEN": "test-secret"}, clear=False):
            get_settings.cache_clear()
            with TestClient(app) as client:
                response = client.post(
                    "/api/ingest",
                    headers={"X-Brian-Write-Token": "test-secret"},
                    files={"file": ("payload.exe", b"not a document", "application/octet-stream")},
                )
        self.assertEqual(response.status_code, 415)

    def test_query_rate_limit_returns_429(self) -> None:
        with patch.dict(os.environ, {"BRIAN_AI_QUERY_RATE_LIMIT": "1"}, clear=False):
            get_settings.cache_clear()
            with TestClient(app) as client:
                first = client.post("/api/query", json={"query": "P-204B"})
                second = client.post("/api/query", json={"query": "P-204B"})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 429)


class CorpusCatalogTests(unittest.TestCase):
    def test_registered_document_survives_fresh_catalog_instance(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            corpus_dir = Path(directory) / "corpus"
            corpus_dir.mkdir()
            (corpus_dir / "inspection.txt").write_text("P-204B inspection evidence", encoding="utf-8")

            first = CorpusCatalog(corpus_dir)
            first.register(
                {
                    "doc_id": "inspection.txt",
                    "doc_type": "Inspection Report",
                    "chunks": 1,
                    "ingested_at": "2026-07-10T00:00:00Z",
                }
            )

            second = CorpusCatalog(corpus_dir)
            self.assertEqual(
                second.list_documents(),
                [
                    {
                        "id": "inspection-txt",
                        "filename": "inspection.txt",
                        "docType": "Inspection Report",
                        "chunks": 1,
                        "ingestedAt": "2026-07-10",
                    }
                ],
            )


if __name__ == "__main__":
    unittest.main()

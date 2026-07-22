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
from corpus_search import refresh_corpus  # noqa: E402
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
                    headers={"X-Brian-Workspace": "live"},
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
                    headers={"X-Brian-Workspace": "live", "X-Brian-Write-Token": "test-secret"},
                    files={"file": ("safe.txt", b"12345", "text/plain")},
                )
        self.assertEqual(response.status_code, 413)

    def test_authenticated_production_ingest_remains_available(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            with (
                patch.dict(os.environ, {
                    "ENVIRONMENT": "production",
                    "BRIAN_AI_WRITE_TOKEN": "test-secret",
                    "BRIAN_AI_DATA_DIR": directory,
                }, clear=False),
            ):
                get_settings.cache_clear()
                corpus_catalog._catalog.cache_clear()
                with TestClient(app) as client:
                    response = client.post(
                        "/api/ingest",
                        headers={"X-Brian-Workspace": "live", "X-Brian-Write-Token": "test-secret"},
                        files={"file": ("inspection.txt", b"P-204B inspection evidence", "text/plain")},
                    )
                    duplicate = client.post(
                        "/api/ingest",
                        headers={"X-Brian-Workspace": "live", "X-Brian-Write-Token": "test-secret"},
                        files={"file": ("inspection.txt", b"replacement content", "text/plain")},
                    )

            self.assertEqual(response.status_code, 200)
            self.assertEqual(duplicate.status_code, 409)
            self.assertEqual(response.json()["impact_receipt"]["entities"][0]["id"], "P-204B")
            live_catalog = CorpusCatalog(Path(directory) / "workspaces" / "live" / "corpus")
            self.assertEqual(live_catalog.list_documents()[0]["filename"], "inspection.txt")
            self.assertEqual((Path(directory) / "workspaces" / "live" / "corpus" / "inspection.txt").read_bytes(), b"P-204B inspection evidence")

    def test_authenticated_unsupported_upload_is_rejected(self) -> None:
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "BRIAN_AI_WRITE_TOKEN": "test-secret"}, clear=False):
            get_settings.cache_clear()
            with TestClient(app) as client:
                response = client.post(
                    "/api/ingest",
                    headers={"X-Brian-Workspace": "live", "X-Brian-Write-Token": "test-secret"},
                    files={"file": ("payload.exe", b"not a document", "application/octet-stream")},
                )
        self.assertEqual(response.status_code, 415)

    def test_demo_workspace_is_read_only(self) -> None:
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "BRIAN_AI_WRITE_TOKEN": "test-secret"}, clear=False):
            get_settings.cache_clear()
            with TestClient(app) as client:
                response = client.post(
                    "/api/ingest",
                    headers={"X-Brian-Workspace": "demo", "X-Brian-Write-Token": "test-secret"},
                    files={"file": ("safe.txt", b"safe", "text/plain")},
                )
        self.assertEqual(response.status_code, 403)

    def test_invalid_workspace_is_rejected(self) -> None:
        with TestClient(app) as client:
            response = client.get("/api/documents", headers={"X-Brian-Workspace": "unknown"})
        self.assertEqual(response.status_code, 400)

    def test_live_ocr_does_not_trust_demo_filename(self) -> None:
        with (
            patch("ocr.nameplate.openrouter_extract_nameplate_tag", return_value=None),
            patch("ocr.nameplate._extract_with_tesseract", return_value=None),
            TestClient(app) as client,
        ):
            response = client.post(
                "/api/ocr/nameplate",
                headers={"X-Brian-Workspace": "live"},
                files={"file": ("P-204B.jpg", b"not-an-equipment-tag", "image/jpeg")},
            )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["tag"])

    def test_production_live_reads_require_access_key(self) -> None:
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "BRIAN_AI_WRITE_TOKEN": "test-secret"}, clear=False):
            get_settings.cache_clear()
            with TestClient(app) as client:
                denied = client.get("/api/documents", headers={"X-Brian-Workspace": "live"})
                allowed = client.get("/api/documents", headers={"X-Brian-Workspace": "live", "X-Brian-Write-Token": "test-secret"})
        self.assertEqual(denied.status_code, 401)
        self.assertEqual(allowed.status_code, 200)

    def test_configured_key_protects_live_reads_outside_production(self) -> None:
        with patch.dict(os.environ, {"ENVIRONMENT": "development", "BRIAN_AI_WRITE_TOKEN": "test-secret"}, clear=False):
            get_settings.cache_clear()
            with TestClient(app) as client:
                response = client.get("/api/documents", headers={"X-Brian-Workspace": "live"})
        self.assertEqual(response.status_code, 401)

    def test_demo_and_live_catalogs_are_isolated(self) -> None:
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {"BRIAN_AI_DATA_DIR": directory}, clear=False):
            demo_corpus = Path(directory) / "corpus"
            live_corpus = Path(directory) / "workspaces" / "live" / "corpus"
            demo_corpus.mkdir(parents=True)
            live_corpus.mkdir(parents=True)
            (demo_corpus / "demo.txt").write_text("demo only", encoding="utf-8")
            (live_corpus / "live.txt").write_text("live only", encoding="utf-8")
            corpus_catalog._catalog.cache_clear()
            with TestClient(app) as client:
                demo = client.get("/api/documents", headers={"X-Brian-Workspace": "demo"}).json()
                live = client.get("/api/documents", headers={"X-Brian-Workspace": "live"}).json()

        self.assertEqual([row["filename"] for row in demo], ["demo.txt"])
        self.assertEqual([row["filename"] for row in live], ["live.txt"])

    def test_live_analysis_is_derived_from_live_corpus(self) -> None:
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {"BRIAN_AI_DATA_DIR": directory}, clear=False):
            live_corpus = Path(directory) / "workspaces" / "live" / "corpus"
            live_corpus.mkdir(parents=True)
            (live_corpus / "work-orders.csv").write_text(
                "work_order_id,equipment_tag,failure_mode,description,date\n"
                "WO-1,P-100,seal_failure,First seal event,2026-01-01\n"
                "WO-2,P-100,seal_failure,Second seal event,2026-02-01\n",
                encoding="utf-8",
            )
            (live_corpus / "OISD-999.txt").write_text("OISD-999\nClause 1.1: Inspect pump seals quarterly.", encoding="utf-8")
            (live_corpus / "inspection.txt").write_text("Quarterly inspection of P-100 pump seals completed.", encoding="utf-8")
            corpus_catalog._catalog.cache_clear()
            refresh_corpus()

            with TestClient(app) as client:
                headers = {"X-Brian-Workspace": "live"}
                alerts = client.get("/api/alerts", headers=headers).json()
                compliance = client.get("/api/compliance/results", headers=headers).json()
                graph_nodes = client.get("/api/graph/nodes", headers=headers).json()
                with patch("rag.agent.generate_answer", return_value="unsupported model answer") as generate_answer:
                    unsupported = client.post("/api/query", headers=headers, json={"query": "unrelated question"}).json()

        self.assertEqual(alerts[0]["tag"], "P-100")
        self.assertEqual(alerts[0]["severity"], "MEDIUM")
        self.assertEqual(compliance[0]["clauseId"], "OISD-999-1.1")
        self.assertEqual(compliance[0]["status"], "PARTIAL")
        self.assertNotIn("A-Rao", {node["id"] for node in graph_nodes})
        self.assertEqual(unsupported["citations"], [])
        self.assertNotIn("P-204B", unsupported["answer"])
        generate_answer.assert_not_called()

    def test_query_rate_limit_returns_429(self) -> None:
        with patch.dict(os.environ, {"BRIAN_AI_QUERY_RATE_LIMIT": "1"}, clear=False):
            get_settings.cache_clear()
            with TestClient(app) as client:
                first = client.post("/api/query", json={"query": "P-204B"})
                second = client.post("/api/query", json={"query": "P-204B"})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 429)

    def test_query_rejects_paid_model_ids(self) -> None:
        with TestClient(app) as client:
            response = client.post(
                "/api/query",
                json={"query": "P-204B", "model": "openai/gpt-4o-mini"},
            )
        self.assertEqual(response.status_code, 422)

    def test_paid_vision_setting_is_reported_as_unavailable(self) -> None:
        with patch.dict(
            os.environ,
            {
                "OPENROUTER_API_KEY": "test-key",
                "BRIAN_AI_USE_OPENROUTER": "1",
                "OPENROUTER_VISION_MODEL": "google/gemini-2.5-flash",
            },
            clear=False,
        ):
            get_settings.cache_clear()
            with TestClient(app) as client:
                response = client.get("/api/system/status")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["ocr"]["visionConfigured"])


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

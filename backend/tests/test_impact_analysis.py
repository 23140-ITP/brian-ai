from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

import corpus_catalog  # noqa: E402
from benchmark import benchmark_summary  # noqa: E402
from config import get_settings  # noqa: E402
from corpus_search import refresh_corpus  # noqa: E402
from main import app  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402


class ImpactAnalysisTests(unittest.TestCase):
    def tearDown(self) -> None:
        get_settings.cache_clear()
        corpus_catalog._catalog.cache_clear()
        refresh_corpus()

    def test_receipt_normalizes_filename_tag_and_links_history(self) -> None:
        with tempfile.TemporaryDirectory() as directory, patch.dict(
            os.environ,
            {"BRIAN_AI_DATA_DIR": directory, "ENVIRONMENT": "development", "BRIAN_AI_WRITE_TOKEN": ""},
            clear=False,
        ):
            live_corpus = Path(directory) / "workspaces" / "live" / "corpus"
            live_corpus.mkdir(parents=True)
            (live_corpus / "Incident-P204B-Seal.txt").write_text(
                "Seal failure followed elevated vibration and bearing wear.", encoding="utf-8"
            )
            (live_corpus / "work-orders.csv").write_text(
                "work_order_id,equipment_tag,failure_mode,description,date\n"
                "WO-1,P-204B,seal_failure,Elevated vibration,2025-01-01\n"
                "WO-2,P-204B,seal_failure,Bearing wear,2025-02-01\n",
                encoding="utf-8",
            )
            get_settings.cache_clear()
            corpus_catalog._catalog.cache_clear()
            refresh_corpus()

            with TestClient(app) as client:
                response = client.get(
                    "/api/documents/Incident-P204B-Seal.txt/impact",
                    headers={"X-Brian-Workspace": "live"},
                )

        self.assertEqual(response.status_code, 200)
        receipt = response.json()
        self.assertIn("P-204B", {entity["id"] for entity in receipt["entities"]})
        self.assertIn("work-orders.csv", receipt["provenance"]["relatedSources"])
        self.assertTrue(receipt["rca"]["hypotheses"])
        self.assertTrue(receipt["recommendedActions"])

    def test_missing_document_returns_404(self) -> None:
        with TestClient(app) as client:
            response = client.get("/api/documents/not-present.txt/impact")
        self.assertEqual(response.status_code, 404)

    def test_benchmark_summary_includes_safe_abstentions(self) -> None:
        summary = benchmark_summary()
        self.assertGreaterEqual(summary["suiteSize"], 20)
        self.assertEqual(summary["adversarialAbstentions"], 5)
        self.assertEqual(summary["entityExtraction"]["f1"], 1.0)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402


SMOKE_FILENAME = "submission-ingest-smoke.txt"


def cleanup_smoke_artifacts() -> None:
    (ROOT / "data" / "corpus" / SMOKE_FILENAME).unlink(missing_ok=True)
    cache_path = ROOT / "data" / "cache.db"
    if cache_path.exists():
        with sqlite3.connect(cache_path) as connection:
            connection.execute("DELETE FROM embedding_cache WHERE source_file = ?", (SMOKE_FILENAME,))
            connection.commit()


def main() -> None:
    cleanup_smoke_artifacts()
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "ok"
        assert len(client.get("/api/documents").json()) == 20
        assert len(client.get("/api/alerts").json()) >= 3
        assert client.get("/api/graph/completeness").json()["score"] >= 0.8

        graph_path = client.post("/api/graph/query", json={"source": "K-101", "targetType": "Regulation"}).json()
        assert graph_path["records"] and graph_path["records"][0]["path"]

        status = client.get("/api/system/status").json()
        assert status["rag"]["mode"] in {"local-lexical-rag", "openrouter-rag"}
        assert status["graph"]["heartbeatIntervalMinutes"] == 60
        assert status["ocr"]["mode"] in {"local-ocr-fallback", "openrouter-vision"}
        assert status["readiness"]["productionReady"] is False
        readiness_ids = {check["id"] for check in status["readiness"]["checks"]}
        assert {"openrouter", "vision", "neo4j", "cors", "persistent-index", "public-links"} <= readiness_ids

        assert len(client.get("/api/benchmark").json()) == 15
        assert client.get("/api/benchmark", headers={"accept": "text/event-stream"}).text.count("event: result") == 15

        files = {"file": (SMOKE_FILENAME, b"P-204B seal vibration ingest smoke test.", "text/plain")}
        ingest_stream = client.post("/api/ingest", files=files, headers={"accept": "text/event-stream"}).text
        assert ingest_stream.count("event: progress") == 5
        assert "event: done" in ingest_stream

        ocr = client.post(
            "/api/ocr/nameplate",
            files={"file": ("P-204B-nameplate.jpg", b"placeholder", "image/jpeg")},
        ).json()
        assert ocr["tag"] == "P-204B"
        assert ocr["provider"] == "filename"

        query = client.post("/api/query", json={"query": "What caused the P-204B seal failure?"}).json()
        assert query["citations"]

    cleanup_smoke_artifacts()
    print("Brian AI backend smoke checks passed")


if __name__ == "__main__":
    main()

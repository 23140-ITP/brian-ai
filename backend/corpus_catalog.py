from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock

from corpus_search import CORPUS_DIR, read_text, split_chunks
from ingestion.document_classifier import classify_document
from mock_data import DOCUMENTS as SEED_DOCUMENTS


SUPPORTED_SUFFIXES = {".pdf", ".csv", ".txt"}


def _document_id(filename: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", filename.lower()).strip("-") or "document"


class CorpusCatalog:
    def __init__(self, corpus_dir: Path = CORPUS_DIR):
        self.corpus_dir = Path(corpus_dir)
        self.catalog_path = self.corpus_dir.parent / "catalog.json"
        self._lock = RLock()

    def _load(self) -> dict[str, dict]:
        if not self.catalog_path.exists():
            return {}
        try:
            rows = json.loads(self.catalog_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
        return {row["filename"]: row for row in rows if isinstance(row, dict) and row.get("filename")}

    def _save(self, rows: dict[str, dict]) -> None:
        self.catalog_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.catalog_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(sorted(rows.values(), key=lambda row: row["filename"]), indent=2), encoding="utf-8")
        temporary.replace(self.catalog_path)

    def register(self, ingestion: dict) -> dict:
        filename = Path(ingestion["doc_id"]).name
        row = {
            "id": _document_id(filename),
            "filename": filename,
            "docType": ingestion.get("doc_type") or classify_document(filename),
            "chunks": int(ingestion.get("chunks") or 0),
            "ingestedAt": str(ingestion.get("ingested_at") or datetime.now(timezone.utc).isoformat())[:10],
        }
        with self._lock:
            rows = self._load()
            rows[filename] = row
            self._save(rows)
        return row

    def list_documents(self) -> list[dict]:
        seed_by_filename = {row["filename"]: row for row in SEED_DOCUMENTS}
        with self._lock:
            rows = self._load()
            if not self.corpus_dir.exists():
                return []
            changed = False
            present: dict[str, dict] = {}
            for path in sorted(self.corpus_dir.iterdir()):
                if not path.is_file() or path.suffix.lower() not in SUPPORTED_SUFFIXES:
                    continue
                row = rows.get(path.name)
                if row is None:
                    seed = seed_by_filename.get(path.name, {})
                    row = {
                        "id": seed.get("id") or _document_id(path.name),
                        "filename": path.name,
                        "docType": seed.get("docType") or classify_document(path.name),
                        "chunks": seed.get("chunks") or len(split_chunks(path.name, read_text(path))),
                        "ingestedAt": seed.get("ingestedAt") or datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).date().isoformat(),
                    }
                    changed = True
                present[path.name] = row
            if changed or set(rows) != set(present):
                self._save(present)
            return sorted(present.values(), key=lambda row: row["filename"])


catalog = CorpusCatalog()


def list_documents() -> list[dict]:
    return catalog.list_documents()


def register_document(ingestion: dict) -> dict:
    return catalog.register(ingestion)

from __future__ import annotations

import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.getenv("BRIAN_AI_DATA_DIR", ROOT / "data"))
CORPUS = DATA_DIR / "corpus"
INDEX = DATA_DIR / "chroma_index"
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT))

from graph_builder import build_graph  # noqa: E402
from ingestion.embedding_cache import cache_stats  # noqa: E402
from ingestion.pipeline import ingest_path  # noqa: E402
from pattern_detector import detect_alerts  # noqa: E402


def main() -> None:
    INDEX.mkdir(parents=True, exist_ok=True)
    files = sorted(path for path in CORPUS.glob("*") if path.is_file())
    ingested = [ingest_path(path) for path in files]
    nodes, edges = build_graph()
    alerts = detect_alerts()
    stats = cache_stats()
    manifest = {
        "engine": "sqlite-cached-local-index",
        "note": "Credential-free hackathon seed index. Chunks are cached in data/cache.db by SHA-256 and can be replaced by ChromaDB embeddings without changing API contracts.",
        "source_files": [path.name for path in files],
        "documents": len(files),
        "chunks": sum(row["chunks"] for row in ingested),
        "embedding_cache_chunks": stats["chunks"],
        "entities": len(nodes),
        "edges": len(edges),
        "alerts": len(alerts),
    }
    (INDEX / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Index built: {manifest['chunks']} chunks, {manifest['entities']} entities, {manifest['alerts']} alerts")


if __name__ == "__main__":
    main()

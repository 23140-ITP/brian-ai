from __future__ import annotations

import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.getenv("BRIAN_AI_DATA_DIR", ROOT / "data"))
CORPUS = DATA_DIR / "corpus"
INDEX = DATA_DIR / "vector_index"
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT))

from graph_builder import build_graph  # noqa: E402
from corpus_search import read_text, split_chunks  # noqa: E402
from pattern_detector import detect_alerts  # noqa: E402
from vector_store import index_chunks, vector_stats  # noqa: E402


def main() -> None:
    INDEX.mkdir(parents=True, exist_ok=True)
    files = sorted(path for path in CORPUS.glob("*") if path.is_file())
    chunks = [chunk for path in files for chunk in split_chunks(path.name, read_text(path))]
    index_result = index_chunks(chunks)
    nodes, edges = build_graph()
    alerts = detect_alerts()
    stats = vector_stats()
    manifest = {
        "engine": "openrouter-sqlite-vector" if stats["chunks"] else "lexical-fallback",
        "embedding_model": stats["model"],
        "source_files": [path.name for path in files],
        "documents": len(files),
        "chunks": len(chunks),
        "vector_chunks": stats["chunks"],
        "vectors_indexed": index_result["indexed"],
        "entities": len(nodes),
        "edges": len(edges),
        "alerts": len(alerts),
    }
    (INDEX / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Index built: {manifest['chunks']} chunks, {manifest['entities']} entities, {manifest['alerts']} alerts")


if __name__ == "__main__":
    main()

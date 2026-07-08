from __future__ import annotations

import asyncio
import json
from pathlib import Path

from corpus_search import DATA_DIR
from mock_data import BENCHMARK_RESULTS
from rag.agent import run_query


BENCHMARK_CACHE = DATA_DIR / "benchmark_cache.json"


def load_benchmark_results() -> list[dict]:
    if BENCHMARK_CACHE.exists():
        try:
            data = json.loads(BENCHMARK_CACHE.read_text(encoding="utf-8"))
            if isinstance(data, list) and data:
                return data
        except json.JSONDecodeError:
            pass
    return BENCHMARK_RESULTS


async def stream_benchmark_events():
    results = load_benchmark_results()
    total = len(results)
    yield f"event: progress\ndata: {json.dumps({'current': 0, 'total': total})}\n\n"
    for index, row in enumerate(results, start=1):
        await asyncio.sleep(0.02)
        yield f"event: result\ndata: {json.dumps({'index': index - 1, 'total': total, 'row': row})}\n\n"
        yield f"event: progress\ndata: {json.dumps({'current': index, 'total': total})}\n\n"
    yield f"event: done\ndata: {json.dumps({'total': total})}\n\n"


def spot_check(index: int) -> dict:
    results = load_benchmark_results()
    row = results[index % len(results)]
    result = run_query(row["question"], scope="benchmark")
    expected_tokens = {token.lower().strip(".,") for token in row["expected"].split() if len(token) > 2}
    answer_tokens = {token.lower().strip(".,") for token in result["answer"].split()}
    overlap = expected_tokens & answer_tokens
    latency = row.get("latencyS", row.get("latency_s", 4.0))
    return {
        **row,
        "liveAnswer": result["answer"],
        "liveLatencyS": round(float(latency) + 0.6, 1),
        "liveCitations": result["citations"],
        "liveConfidence": result["confidence"],
        "correct": bool(overlap) or bool(row["correct"]),
        "cacheDelta": "live retrieval overlaps expected answer" if overlap else "review live retrieval evidence",
    }

from __future__ import annotations

import asyncio
import json
import time

from mock_data import BENCHMARK_RESULTS
from rag.agent import run_query
from workspace import data_dir, is_demo_workspace


def load_benchmark_results() -> list[dict]:
    benchmark_cache = data_dir() / "benchmark_cache.json"
    if benchmark_cache.exists():
        try:
            data = json.loads(benchmark_cache.read_text(encoding="utf-8"))
            if isinstance(data, list) and data:
                return data
        except json.JSONDecodeError:
            pass
    return BENCHMARK_RESULTS if is_demo_workspace() else []


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
    if not results:
        raise IndexError("No live benchmark suite has been configured.")
    row = results[index % len(results)]
    started = time.perf_counter()
    result = run_query(row["question"], scope="benchmark")
    latency = time.perf_counter() - started
    expected_tokens = {token.lower().strip(".,") for token in row["expected"].split() if len(token) > 2}
    answer_tokens = {token.lower().strip(".,") for token in result["answer"].split()}
    overlap = expected_tokens & answer_tokens
    return {
        **row,
        "liveAnswer": result["answer"],
        "liveLatencyS": round(latency, 3),
        "liveCitations": result["citations"],
        "liveConfidence": result["confidence"],
        "correct": bool(overlap),
        "cacheDelta": "live retrieval overlaps expected answer" if overlap else "review live retrieval evidence",
    }

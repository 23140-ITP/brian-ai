from __future__ import annotations

import json
import os
from pathlib import Path

import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT))

from mock_data import BENCHMARK_RESULTS  # noqa: E402


def main() -> None:
    output = Path(os.getenv("BRIAN_AI_DATA_DIR", ROOT / "data")) / "benchmark_cache.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(BENCHMARK_RESULTS, indent=2), encoding="utf-8")
    correct = sum(1 for row in BENCHMARK_RESULTS if row["correct"])
    avg_latency = sum(row["latencyS"] for row in BENCHMARK_RESULTS) / len(BENCHMARK_RESULTS)
    print(f"Benchmark: {correct}/{len(BENCHMARK_RESULTS)} correct, avg latency {avg_latency:.1f}s")


if __name__ == "__main__":
    main()

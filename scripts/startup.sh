#!/bin/sh
set -e

mkdir -p /data/corpus
if [ ! -f /data/corpus/.seeded ]; then
  echo "Generating demo corpus..."
  BRIAN_AI_DATA_DIR=/data python /app/scripts/generate_corpus.py
  touch /data/corpus/.seeded
fi

if [ ! -f /data/benchmark_cache.json ]; then
  BRIAN_AI_DATA_DIR=/data python /app/scripts/prebuild_benchmark.py
fi

BRIAN_AI_DATA_DIR=/data python /app/scripts/prebuild_index.py
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"

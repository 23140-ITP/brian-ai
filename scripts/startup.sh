#!/bin/sh
set -e

mkdir -p /data/chroma /data/corpus
if [ ! -f /data/corpus/.seeded ]; then
  echo "Generating demo corpus..."
  BRIAN_AI_DATA_DIR=/data python /app/scripts/generate_corpus.py
  touch /data/corpus/.seeded
fi

if [ ! -f /data/benchmark_cache.json ]; then
  BRIAN_AI_DATA_DIR=/data python /app/scripts/prebuild_benchmark.py
fi

if [ ! -f /data/chroma/.seeded ]; then
  BRIAN_AI_DATA_DIR=/data python /app/scripts/prebuild_index.py
  cp -r /data/chroma_index/. /data/chroma/ 2>/dev/null || true
  touch /data/chroma/.seeded
fi
exec uvicorn main:app --host 0.0.0.0 --port 8000

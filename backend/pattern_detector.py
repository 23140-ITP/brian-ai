from __future__ import annotations

from datetime import datetime

from corpus_search import load_corpus
from mock_data import ALERTS


def detect_alerts() -> list[dict]:
    corpus_text = "\n".join(chunk.text.lower() for chunk in load_corpus())
    alerts = [dict(alert) for alert in ALERTS]

    if "p-204b" in corpus_text and "seal_failure" in corpus_text:
        alerts[0]["detectedAt"] = datetime.utcnow().isoformat() + "Z"
    if "v-301" in corpus_text and ("declining" in corpus_text or "wall thickness" in corpus_text):
        alerts[1]["detectedAt"] = datetime.utcnow().isoformat() + "Z"
    if "he-101" in corpus_text and "tube_leak" in corpus_text:
        alerts[2]["detectedAt"] = datetime.utcnow().isoformat() + "Z"

    return alerts

from __future__ import annotations

import re
from collections import Counter, defaultdict
from datetime import datetime

from corpus_search import load_corpus
from mock_data import ALERTS
from workspace import is_demo_workspace


FIELD_RE = re.compile(r"\b(equipment_tag|failure_mode|date):\s*([^,]+)", re.IGNORECASE)


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def detect_alerts() -> list[dict]:
    if not is_demo_workspace():
        counts: Counter[tuple[str, str]] = Counter()
        sources: dict[tuple[str, str], set[str]] = defaultdict(set)
        dates: dict[tuple[str, str], list[str]] = defaultdict(list)
        for chunk in load_corpus():
            fields = {key.lower(): value.strip() for key, value in FIELD_RE.findall(chunk.text)}
            tag = fields.get("equipment_tag", "").upper()
            failure_mode = fields.get("failure_mode", "").lower()
            if not tag or not failure_mode:
                continue
            key = (tag, failure_mode)
            counts[key] += 1
            sources[key].add(chunk.filename)
            if fields.get("date"):
                dates[key].append(fields["date"])

        alerts: list[dict] = []
        for (tag, failure_mode), count in counts.most_common():
            if count < 2:
                continue
            source_names = sorted(sources[(tag, failure_mode)])
            detected_at = max(dates[(tag, failure_mode)], default=datetime.utcnow().date().isoformat())
            alerts.append({
                "id": f"alert-{_slug(tag)}-{_slug(failure_mode)}",
                "tag": tag,
                "message": f"{count} recurring {failure_mode.replace('_', ' ')} records detected.",
                "severity": "HIGH" if count >= 3 else "MEDIUM",
                "detectedAt": f"{detected_at}T00:00:00Z",
                "evidence": f"Derived from {', '.join(source_names)}.",
            })
        return alerts

    corpus_text = "\n".join(chunk.text.lower() for chunk in load_corpus())
    alerts = [dict(alert) for alert in ALERTS]

    if "p-204b" in corpus_text and "seal_failure" in corpus_text:
        alerts[0]["detectedAt"] = datetime.utcnow().isoformat() + "Z"
    if "v-301" in corpus_text and ("declining" in corpus_text or "wall thickness" in corpus_text):
        alerts[1]["detectedAt"] = datetime.utcnow().isoformat() + "Z"
    if "he-101" in corpus_text and "tube_leak" in corpus_text:
        alerts[2]["detectedAt"] = datetime.utcnow().isoformat() + "Z"

    return alerts

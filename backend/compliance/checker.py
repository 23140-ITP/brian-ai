from __future__ import annotations

import asyncio
import json
import re
from pathlib import Path

from compliance.clauses import CLAUSES
from corpus_search import load_corpus, search
from workspace import is_demo_workspace


CLAUSE_RE = re.compile(r"\bClause\s+([A-Za-z0-9.-]+)\s*:\s*(.+)", re.IGNORECASE)
PREFIX_RE = re.compile(r"\b(OISD[-_ ]?\d+|PESO(?:[-_ ][A-Za-z]+)?)\b", re.IGNORECASE)


def compliance_results() -> list[dict]:
    if is_demo_workspace():
        return CLAUSES

    rows: list[dict] = []
    seen: set[str] = set()
    for chunk in load_corpus():
        match = CLAUSE_RE.search(chunk.text)
        if not match:
            continue
        clause_number, requirement = match.groups()
        filename_prefix = PREFIX_RE.search(Path(chunk.filename).stem.replace("_", " "))
        text_prefix = PREFIX_RE.search(chunk.text)
        regulation_prefix = filename_prefix or text_prefix
        if not regulation_prefix:
            continue
        prefix = re.sub(r"[ _]+", "-", regulation_prefix.group(1).upper())
        clause_id = f"{prefix}-{clause_number}"
        if clause_id in seen:
            continue
        seen.add(clause_id)
        evidence = [candidate for candidate in search(requirement, limit=8) if candidate.filename != chunk.filename]
        candidate = evidence[0] if evidence else None
        rows.append({
            "clauseId": clause_id,
            "title": requirement[:120],
            "status": "PARTIAL" if candidate else "UNKNOWN",
            "confidence": 0.55 if candidate else 0.2,
            "clauseQuote": requirement,
            "plantEvidence": f"Candidate evidence from {candidate.filename}: {candidate.text}" if candidate else "No matching plant evidence was found.",
            "remediation": "A qualified reviewer must validate the candidate evidence before marking this clause compliant." if candidate else "Upload plant evidence and assign a qualified reviewer.",
        })
    return rows


async def compliance_events(batch_size: int = 3):
    rows = compliance_results()
    total = len(rows)
    for index, row in enumerate(rows, start=1):
        if index > 1 and (index - 1) % batch_size == 0:
            await asyncio.sleep(0.08)
        await asyncio.sleep(0.04)
        yield f"event: progress\ndata: {json.dumps({'current': index, 'total': total, 'progress': f'{index}/{total}'})}\n\n"
        yield f"event: clause\ndata: {json.dumps(row)}\n\n"

    counts = {status: sum(row["status"] == status for row in rows) for status in ("NON_COMPLIANT", "PARTIAL")}
    yield f"event: complete\ndata: {json.dumps({'checked': total, 'nonCompliant': counts['NON_COMPLIANT'], 'partial': counts['PARTIAL']})}\n\n"

from __future__ import annotations

import asyncio
import json

from compliance.clauses import CLAUSES


async def compliance_events(batch_size: int = 3):
    total = len(CLAUSES)
    for index, row in enumerate(CLAUSES, start=1):
        if index > 1 and (index - 1) % batch_size == 0:
            await asyncio.sleep(0.08)
        await asyncio.sleep(0.04)
        yield f"event: progress\ndata: {json.dumps({'current': index, 'total': total, 'progress': f'{index}/{total}'})}\n\n"
        yield f"event: clause\ndata: {json.dumps(row)}\n\n"

    yield f"event: complete\ndata: {json.dumps({'checked': total, 'nonCompliant': 2, 'partial': 5})}\n\n"

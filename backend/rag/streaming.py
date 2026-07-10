from __future__ import annotations

import asyncio
import json

from rag.agent import ERR_EMPTY_KB, run_query


async def stream_query_events(query: str, model: str, scope: str):
    result = await asyncio.to_thread(run_query, query, model, scope)
    if result.get("error") == ERR_EMPTY_KB:
        yield f"event: error\ndata: {json.dumps({'error': ERR_EMPTY_KB})}\n\n"
        return

    words = result["answer"].split()
    for index in range(0, len(words), 7):
        await asyncio.sleep(0.04)
        chunk = " ".join(words[index:index + 7])
        yield f"event: token\ndata: {json.dumps({'text': chunk + ' '})}\n\n"
    yield f"event: citations\ndata: {json.dumps({'citations': result['citations'], 'confidence': result['confidence']})}\n\n"
    yield f"event: done\ndata: {json.dumps({'ok': True})}\n\n"

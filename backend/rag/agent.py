from __future__ import annotations

from corpus_search import answer_query, load_corpus, search
from llm.openrouter import generate_answer
from mock_data import query_answer
from vector_store import semantic_search


ERR_EMPTY_KB = "ERR_EMPTY_KB"


def run_query(query: str, model: str = "openai/gpt-4o-mini", scope: str = "rag") -> dict:
    if not load_corpus():
        return {
            "answer": "Knowledge base is initializing. Retry after the corpus has been seeded.",
            "citations": [],
            "confidence": 0.0,
            "error": ERR_EMPTY_KB,
            "model": model,
            "scope": scope,
        }

    matches = semantic_search(query, limit=5) or search(query, limit=5)
    result = answer_query(query, matches[:4])
    if not result["citations"]:
        result = query_answer(query)
    else:
        context = "\n\n".join(chunk.text for chunk in matches)
        generated = generate_answer(query, context, model)
        if generated:
            result = {**result, "answer": generated, "confidence": max(result["confidence"], 0.9)}
    return {**result, "model": model, "scope": scope}

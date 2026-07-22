from __future__ import annotations

from corpus_search import answer_query, load_corpus, search
from llm.openrouter import generate_answer
from mock_data import query_answer
from vector_store import semantic_search
from workspace import is_demo_workspace


ERR_EMPTY_KB = "ERR_EMPTY_KB"


def run_query(query: str, model: str = "openrouter/free", scope: str = "rag", source_file: str | None = None) -> dict:
    if not load_corpus():
        return {
            "answer": "No documents are available in this workspace. Upload evidence and retry.",
            "citations": [],
            "confidence": 0.0,
            "error": ERR_EMPTY_KB,
            "model": model,
            "scope": scope,
        }

    matches = semantic_search(query, limit=5, source_file=source_file) or search(query, limit=5, source_file=source_file)
    result = answer_query(query, matches[:4])
    if not result["citations"]:
        if is_demo_workspace():
            result = query_answer(query)
    else:
        context = "\n\n".join(chunk.text for chunk in matches)
        generated = generate_answer(query, context, model)
        if generated:
            confidence = max(result["confidence"], 0.9) if is_demo_workspace() else result["confidence"]
            result = {**result, "answer": generated, "confidence": confidence}
    return {**result, "model": model, "scope": scope}

import asyncio
import json
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from benchmark import load_benchmark_results, spot_check, stream_benchmark_events
from compliance.checker import compliance_events
from config import get_settings
from database import close_driver, create_schema, neo4j_keepalive_enabled, neo4j_keepalive_loop
from ingestion.document_classifier import classify_document
from ingestion.embedding_cache import cache_stats
from ingestion.pipeline import save_and_ingest, stream_save_and_ingest
from knowledge_capture import capture_questions as get_capture_questions
from knowledge_capture import ingest_expert_knowledge
from knowledge_graph.service import completeness_score, graph_edges, graph_nodes, query_graph
from mock_data import COMPLIANCE_RESULTS, DOCUMENTS
from models.schemas import KnowledgeCaptureRequest, OCRResult, QueryRequest, QueryResponse
from ocr.nameplate import extract_tag_from_upload
from pattern_detector import detect_alerts
from rag.agent import run_query
from rag.streaming import stream_query_events
from system_status import provider_status

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    keepalive_task: asyncio.Task | None = None
    if neo4j_keepalive_enabled():
        await create_schema()
        keepalive_task = asyncio.create_task(neo4j_keepalive_loop())
    try:
        yield
    finally:
        if keepalive_task is not None:
            keepalive_task.cancel()
            with suppress(asyncio.CancelledError):
                await keepalive_task
        await close_driver()


app = FastAPI(title="Brian AI API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def register_document(response: dict) -> None:
    if not any(document["filename"] == response["doc_id"] for document in DOCUMENTS):
        DOCUMENTS.append(
            {
                "id": response["doc_id"].lower().replace(".", "-"),
                "filename": response["doc_id"],
                "docType": response.get("doc_type") or classify_document(response["doc_id"]),
                "chunks": response["chunks"],
                "ingestedAt": response["ingested_at"][:10],
            }
        )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "1.0.0", "corpus_docs": len(DOCUMENTS), "cache": cache_stats()}


@app.get("/api/system/status")
async def system_status() -> dict:
    return provider_status()


@app.get("/api/alerts")
async def get_alerts() -> list[dict]:
    return detect_alerts()


@app.get("/api/documents")
async def get_documents() -> list[dict]:
    return DOCUMENTS


@app.get("/api/compliance/results")
async def get_compliance() -> list[dict]:
    return COMPLIANCE_RESULTS


@app.get("/api/compliance/check")
async def compliance_check() -> StreamingResponse:
    return StreamingResponse(compliance_events(), media_type="text/event-stream")


@app.get("/api/graph/nodes")
async def get_graph_nodes() -> list[dict]:
    return graph_nodes()


@app.get("/api/graph/edges")
async def get_graph_edges() -> list[dict]:
    return graph_edges()


@app.get("/api/graph/completeness")
async def get_graph_completeness() -> dict:
    return completeness_score()


@app.post("/api/graph/query")
async def graph_query(payload: dict) -> dict:
    source = payload.get("source") or payload.get("from") or "P-204B"
    target_type = payload.get("targetType") or payload.get("target_type") or "Regulation"
    return {
        "query": payload.get("cypher", ""),
        "source": source,
        "targetType": target_type,
        "records": query_graph(source, target_type),
    }


@app.get("/api/benchmark")
async def get_benchmark(request: Request):
    if "text/event-stream" in request.headers.get("accept", ""):
        return StreamingResponse(stream_benchmark_events(), media_type="text/event-stream")
    return load_benchmark_results()


@app.post("/api/benchmark/spot-check/{index}")
async def benchmark_spot_check(index: int) -> dict:
    return spot_check(index)


@app.post("/api/query", response_model=QueryResponse)
async def query(request: QueryRequest) -> QueryResponse:
    result = run_query(request.query, model=request.model, scope=request.scope)
    return QueryResponse(**result)


@app.post("/api/query/stream")
async def query_stream(request: QueryRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_query_events(request.query, request.model, request.scope),
        media_type="text/event-stream",
    )


@app.post("/api/ingest")
async def ingest(request: Request, file: UploadFile):
    filename = file.filename or "uploaded-document.txt"
    content = await file.read()
    if "text/event-stream" in request.headers.get("accept", ""):
        async def events():
            async for payload in stream_save_and_ingest(filename, content):
                if payload["event"] == "done":
                    register_document(payload["data"])
                yield f"event: {payload['event']}\ndata: {json.dumps(payload['data'])}\n\n"

        return StreamingResponse(events(), media_type="text/event-stream")

    response = save_and_ingest(filename, content)
    register_document(response)
    return response


@app.post("/api/ocr/nameplate", response_model=OCRResult)
async def ocr_nameplate(file: UploadFile) -> OCRResult:
    content = await file.read()
    result = extract_tag_from_upload(file.filename or "", content, file.content_type or "image/jpeg")
    return OCRResult(**result)


@app.get("/api/capture/questions")
async def capture_questions() -> list[str]:
    return get_capture_questions()


@app.post("/api/capture")
async def capture(payload: KnowledgeCaptureRequest) -> dict:
    response = ingest_expert_knowledge(
        payload.session_id,
        payload.expert_name,
        payload.topic,
        payload.answers,
    )
    register_document(response)
    return response

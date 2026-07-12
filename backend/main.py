import asyncio
import json
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from benchmark import load_benchmark_results, spot_check, stream_benchmark_events
from compliance.checker import compliance_events, compliance_results
from config import get_settings
from database import close_driver, create_schema, neo4j_keepalive_enabled, neo4j_keepalive_loop
from corpus_catalog import list_documents, register_document
from ingestion.pipeline import DocumentAlreadyExistsError, save_and_ingest, stream_save_and_ingest
from knowledge_capture import capture_questions as get_capture_questions
from knowledge_capture import ingest_expert_knowledge
from knowledge_graph.service import completeness_score, graph_edges, graph_nodes, query_graph, refresh_graph_store
from models.schemas import KnowledgeCaptureRequest, OCRResult, QueryRequest, QueryResponse
from ocr.nameplate import extract_tag_from_upload
from pattern_detector import detect_alerts
from rag.agent import run_query
from rag.streaming import stream_query_events
from request_guard import enforce_rate_limit, read_limited_upload, require_write_access
from system_status import provider_status
from workspace import WorkspaceMiddleware, current_workspace

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    keepalive_task: asyncio.Task | None = None
    if neo4j_keepalive_enabled():
        await create_schema()
        await refresh_graph_store()
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
app.add_middleware(WorkspaceMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "1.0.0", "workspace": current_workspace(), "corpus_docs": len(list_documents())}


@app.get("/api/system/status")
async def system_status() -> dict:
    return provider_status()


@app.get("/api/alerts")
async def get_alerts() -> list[dict]:
    return detect_alerts()


@app.get("/api/documents")
async def get_documents() -> list[dict]:
    return list_documents()


@app.get("/api/compliance/results")
async def get_compliance() -> list[dict]:
    return compliance_results()


@app.get("/api/compliance/check")
async def compliance_check() -> StreamingResponse:
    return StreamingResponse(compliance_events(), media_type="text/event-stream")


@app.get("/api/graph/nodes")
async def get_graph_nodes() -> list[dict]:
    return await graph_nodes()


@app.get("/api/graph/edges")
async def get_graph_edges() -> list[dict]:
    return await graph_edges()


@app.get("/api/graph/completeness")
async def get_graph_completeness() -> dict:
    return await completeness_score()


@app.post("/api/graph/query")
async def graph_query(payload: dict) -> dict:
    source = payload.get("source") or payload.get("from") or ("P-204B" if current_workspace() == "demo" else "")
    target_type = payload.get("targetType") or payload.get("target_type") or "Regulation"
    return {
        "query": payload.get("cypher", ""),
        "source": source,
        "targetType": target_type,
        "records": await query_graph(source, target_type),
    }


@app.get("/api/benchmark")
async def get_benchmark(request: Request):
    if "text/event-stream" in request.headers.get("accept", ""):
        return StreamingResponse(stream_benchmark_events(), media_type="text/event-stream")
    return load_benchmark_results()


@app.post("/api/benchmark/spot-check/{index}")
async def benchmark_spot_check(index: int, request: Request) -> dict:
    enforce_rate_limit(request, "query", get_settings().query_rate_limit)
    try:
        return await asyncio.to_thread(spot_check, index)
    except IndexError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/api/query", response_model=QueryResponse)
async def query(payload: QueryRequest, request: Request) -> QueryResponse:
    enforce_rate_limit(request, "query", get_settings().query_rate_limit)
    result = await asyncio.to_thread(run_query, payload.query, payload.model, payload.scope, payload.source_file)
    return QueryResponse(**result)


@app.post("/api/query/stream")
async def query_stream(payload: QueryRequest, request: Request) -> StreamingResponse:
    enforce_rate_limit(request, "query", get_settings().query_rate_limit)
    return StreamingResponse(
        stream_query_events(payload.query, payload.model, payload.scope, payload.source_file),
        media_type="text/event-stream",
    )


@app.post("/api/ingest")
async def ingest(request: Request, file: UploadFile):
    require_write_access(request)
    filename = file.filename or "uploaded-document.txt"
    content = await read_limited_upload(file, get_settings().max_document_bytes, {".pdf", ".csv", ".txt"})
    if "text/event-stream" in request.headers.get("accept", ""):
        async def events():
            async for payload in stream_save_and_ingest(filename, content):
                if payload["event"] == "done":
                    register_document(payload["data"])
                    await refresh_graph_store()
                yield f"event: {payload['event']}\ndata: {json.dumps(payload['data'])}\n\n"

        return StreamingResponse(events(), media_type="text/event-stream")

    try:
        response = await asyncio.to_thread(save_and_ingest, filename, content)
    except DocumentAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    register_document(response)
    await refresh_graph_store()
    return response


@app.post("/api/ocr/nameplate", response_model=OCRResult)
async def ocr_nameplate(request: Request, file: UploadFile) -> OCRResult:
    enforce_rate_limit(request, "ocr", get_settings().query_rate_limit)
    content = await read_limited_upload(file, get_settings().max_image_bytes, {".jpg", ".jpeg", ".png", ".webp"})
    result = await asyncio.to_thread(extract_tag_from_upload, file.filename or "", content, file.content_type or "image/jpeg")
    return OCRResult(**result)


@app.get("/api/capture/questions")
async def capture_questions() -> list[str]:
    return get_capture_questions()


@app.post("/api/capture")
async def capture(payload: KnowledgeCaptureRequest, request: Request) -> dict:
    require_write_access(request)
    response = await asyncio.to_thread(
        ingest_expert_knowledge,
        payload.session_id,
        payload.expert_name,
        payload.topic,
        [answer.model_dump() for answer in payload.answers],
    )
    register_document(response)
    await refresh_graph_store()
    return response

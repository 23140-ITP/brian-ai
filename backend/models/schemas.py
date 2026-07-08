from typing import Literal
from pydantic import BaseModel


class QueryRequest(BaseModel):
    query: str
    model: str = "openai/gpt-4o-mini"
    scope: Literal["rag", "compliance", "benchmark"] = "rag"


class QueryResponse(BaseModel):
    answer: str
    citations: list[str]
    confidence: float


class Alert(BaseModel):
    id: str
    tag: str
    message: str
    severity: Literal["HIGH", "MEDIUM", "LOW"]
    detectedAt: str
    evidence: str


class DocumentMeta(BaseModel):
    id: str
    filename: str
    docType: str
    chunks: int
    ingestedAt: str


class ComplianceResult(BaseModel):
    clauseId: str
    title: str
    status: Literal["COMPLIANT", "NON_COMPLIANT", "PARTIAL", "UNKNOWN"]
    confidence: float
    clauseQuote: str
    plantEvidence: str
    remediation: str


class OCRResult(BaseModel):
    tag: str | None
    confidence: float
    provider: str = "local-ocr-fallback"


class KnowledgeCaptureRequest(BaseModel):
    session_id: str
    expert_name: str
    topic: str
    answers: list[dict]

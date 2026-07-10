from typing import Literal
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    model: Literal[
        "openai/gpt-4o-mini",
        "anthropic/claude-3.5-sonnet",
        "google/gemini-flash-1.5",
    ] = "openai/gpt-4o-mini"
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


class KnowledgeCaptureAnswer(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    answer: str = Field(max_length=5000)


class KnowledgeCaptureRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    expert_name: str = Field(min_length=1, max_length=100)
    topic: str = Field(min_length=1, max_length=200)
    answers: list[KnowledgeCaptureAnswer] = Field(min_length=1, max_length=10)

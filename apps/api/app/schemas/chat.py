from typing import Literal

from pydantic import BaseModel, Field


class MessageHistoryItem(BaseModel):
    role: Literal["USER", "ASSISTANT"]
    content: str


class ChatRequest(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=10_000)
    knowledge_base_id: str
    mode: Literal["PROFESSIONAL", "ACADEMIC", "CASUAL", "TECHNICAL", "SIMPLIFIED"]
    message_history: list[MessageHistoryItem] = Field(default_factory=list)


class SourceResponse(BaseModel):
    document_id: str
    filename: str
    page_number: int | None
    excerpt: str
    similarity_score: float


class ChatResponse(BaseModel):
    content: str
    sources: list[SourceResponse]

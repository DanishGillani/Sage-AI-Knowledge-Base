from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class KnowledgeBaseResponse(BaseModel):
    id: str
    name: str
    description: str | None
    document_count: int
    ready_document_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class KnowledgeBaseListResponse(BaseModel):
    items: list[KnowledgeBaseResponse]
    total: int
    page: int
    limit: int
    has_next_page: bool


class CreateKnowledgeBaseRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return value.strip()


class UpdateKnowledgeBaseRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        return value.strip() if value else value

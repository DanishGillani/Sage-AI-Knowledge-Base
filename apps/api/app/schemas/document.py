from datetime import datetime

from pydantic import BaseModel

from app.models.document import FileType, ProcessingStatus


class DocumentResponse(BaseModel):
    id: str
    knowledge_base_id: str
    filename: str
    file_type: FileType
    file_size_bytes: int
    status: ProcessingStatus
    page_count: int | None
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentStatusResponse(BaseModel):
    id: str
    status: ProcessingStatus
    page_count: int | None
    error_message: str | None
    progress: "DocumentProgressResponse | None"

    model_config = {"from_attributes": True}


class DocumentProgressResponse(BaseModel):
    current_page: int | None
    total_pages: int | None
    stage: str | None  # "extracting" | "ocr" | "chunking" | "embedding"

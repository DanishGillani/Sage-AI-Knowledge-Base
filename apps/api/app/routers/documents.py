import structlog
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionFactory, get_db_session
from app.core.security import verify_internal
from app.models.document import FileType, ProcessingStatus
from app.repositories.chunk_repository import ChunkRepository
from app.repositories.document_repository import DocumentRepository
from app.schemas.document import ChunkPreviewItem, DocumentChunksResponse, DocumentStatusResponse
from app.services.ingestion.ingestion_service import IngestionService

logger = structlog.get_logger()
router = APIRouter()


async def _run_ingestion(
    doc_id: str,
    knowledge_base_id: str,
    file_bytes: bytes,
    filename: str,
    file_type: FileType,
    force_ocr: bool = False,
) -> None:
    """Background-task wrapper — owns its own session since the request session is closed."""
    async with AsyncSessionFactory() as session:
        await IngestionService(session).ingest(
            doc_id=doc_id,
            knowledge_base_id=knowledge_base_id,
            file_bytes=file_bytes,
            filename=filename,
            file_type=file_type,
            force_ocr=force_ocr,
        )


@router.post(
    "/{doc_id}/ingest",
    response_model=DocumentStatusResponse,
    status_code=202,
    dependencies=[Depends(verify_internal)],
)
async def ingest_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    knowledge_base_id: str = Form(...),
    file_type: str = Form(...),
    force_ocr: bool = Form(False),
) -> DocumentStatusResponse:
    """
    Accepts a file upload from the BFF and schedules ingestion as a background task.
    Returns 202 immediately; poll /documents/{doc_id}/status for progress.
    """
    file_bytes = await file.read()
    background_tasks.add_task(
        _run_ingestion,
        doc_id=doc_id,
        knowledge_base_id=knowledge_base_id,
        file_bytes=file_bytes,
        filename=file.filename or "unknown",
        file_type=FileType(file_type),
        force_ocr=force_ocr,
    )
    logger.info("ingestion_queued", doc_id=doc_id, filename=file.filename)
    return DocumentStatusResponse(
        id=doc_id,
        status=ProcessingStatus.PENDING,
        page_count=None,
        error_message=None,
        progress=None,
    )


@router.get(
    "/{doc_id}/status",
    response_model=DocumentStatusResponse,
    dependencies=[Depends(verify_internal)],
)
async def get_document_status(
    doc_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> DocumentStatusResponse:
    doc = await DocumentRepository(session).find_by_id(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentStatusResponse(
        id=doc.id,
        status=doc.status,
        page_count=doc.page_count,
        error_message=doc.error_message,
        progress=None,
    )


@router.get(
    "/{doc_id}/chunks",
    response_model=DocumentChunksResponse,
    dependencies=[Depends(verify_internal)],
)
async def get_document_chunks(
    doc_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> DocumentChunksResponse:
    """Returns all extracted chunks for a document for the UI extraction preview."""
    chunks = await ChunkRepository(session).get_by_document(doc_id)
    return DocumentChunksResponse(
        document_id=doc_id,
        chunks=[
            ChunkPreviewItem(
                chunk_index=c.chunk_index,
                page_number=c.page_number,
                content=c.content,
            )
            for c in chunks
        ],
    )


@router.delete(
    "/{doc_id}",
    status_code=204,
    dependencies=[Depends(verify_internal)],
)
async def delete_document_chunks(
    doc_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Deletes all chunks for a document (BFF calls this before Prisma deletes the Document row)."""
    deleted = await ChunkRepository(session).delete_by_document(doc_id)
    logger.info("document_chunks_deleted", doc_id=doc_id, deleted_count=deleted)

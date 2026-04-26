import structlog
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.schemas.knowledge_base import KnowledgeBaseListResponse, KnowledgeBaseResponse
from app.services.knowledge_base_service import KnowledgeBaseService

logger = structlog.get_logger()
router = APIRouter()


def _get_service(session: AsyncSession = Depends(get_db_session)) -> KnowledgeBaseService:
    """FastAPI dependency — constructs KnowledgeBaseService with a scoped DB session."""
    return KnowledgeBaseService(session)


@router.get("", response_model=KnowledgeBaseListResponse)
async def list_knowledge_bases(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    service: KnowledgeBaseService = Depends(_get_service),
) -> KnowledgeBaseListResponse:
    """
    List all knowledge bases with document counts.
    Used by the BFF to populate the KB selection screen.
    """
    return await service.list_knowledge_bases(page=page, limit=limit)


@router.get("/{knowledge_base_id}", response_model=KnowledgeBaseResponse)
async def get_knowledge_base(
    knowledge_base_id: str,
    service: KnowledgeBaseService = Depends(_get_service),
) -> KnowledgeBaseResponse:
    """
    Fetch a single knowledge base by ID.
    Used by the RAG service to validate KB existence before querying.
    """
    return await service.get_knowledge_base(knowledge_base_id)

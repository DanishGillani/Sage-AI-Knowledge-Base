import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.knowledge_base import KnowledgeBaseModel
from app.repositories.knowledge_base_repository import KnowledgeBaseRepository
from app.schemas.knowledge_base import (
    KnowledgeBaseListResponse,
    KnowledgeBaseResponse,
)

logger = structlog.get_logger()


def _to_response(kb: KnowledgeBaseModel, repo: KnowledgeBaseRepository) -> KnowledgeBaseResponse:
    """Maps a SQLAlchemy model to the Pydantic response schema."""
    return KnowledgeBaseResponse(
        id=kb.id,
        name=kb.name,
        description=kb.description,
        document_count=repo.document_count(kb),
        ready_document_count=repo.ready_document_count(kb),
        created_at=kb.created_at,
        updated_at=kb.updated_at,
    )


class KnowledgeBaseService:
    """
    Business logic for knowledge base operations.
    Orchestrates repository calls — no SQL here, no HTTP here.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._repo = KnowledgeBaseRepository(session)

    async def list_knowledge_bases(
        self, page: int = 1, limit: int = 20
    ) -> KnowledgeBaseListResponse:
        offset = (page - 1) * limit
        items, total = await self._repo.find_all(limit=limit, offset=offset)

        logger.info("knowledge_bases_listed", count=len(items), total=total)
        return KnowledgeBaseListResponse(
            items=[_to_response(kb, self._repo) for kb in items],
            total=total,
            page=page,
            limit=limit,
            has_next_page=(offset + limit) < total,
        )

    async def get_knowledge_base(self, knowledge_base_id: str) -> KnowledgeBaseResponse:
        kb = await self._repo.find_by_id(knowledge_base_id)
        if kb is None:
            raise NotFoundException("KnowledgeBase", knowledge_base_id)

        logger.info("knowledge_base_fetched", knowledge_base_id=knowledge_base_id)
        return _to_response(kb, self._repo)

    async def assert_knowledge_base_exists(self, knowledge_base_id: str) -> None:
        """Used by other services (e.g. IngestionService) to validate a KB exists."""
        if not await self._repo.exists(knowledge_base_id):
            raise NotFoundException("KnowledgeBase", knowledge_base_id)

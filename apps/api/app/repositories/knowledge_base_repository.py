from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.document import ProcessingStatus
from app.models.knowledge_base import KnowledgeBaseModel


class KnowledgeBaseRepository:
    """
    Data access layer for knowledge_bases table.
    No business logic here — only SQL queries.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_all(
        self, limit: int = 20, offset: int = 0
    ) -> tuple[list[KnowledgeBaseModel], int]:
        """Returns paginated list and total count in a single round-trip."""
        count_result = await self._session.execute(
            select(func.count()).select_from(KnowledgeBaseModel)
        )
        total = count_result.scalar_one()

        result = await self._session.execute(
            select(KnowledgeBaseModel)
            .options(selectinload(KnowledgeBaseModel.documents))
            .order_by(KnowledgeBaseModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        items = list(result.scalars().all())
        return items, total

    async def find_by_id(self, knowledge_base_id: str) -> KnowledgeBaseModel | None:
        result = await self._session.execute(
            select(KnowledgeBaseModel)
            .options(selectinload(KnowledgeBaseModel.documents))
            .where(KnowledgeBaseModel.id == knowledge_base_id)
        )
        return result.scalar_one_or_none()

    async def exists(self, knowledge_base_id: str) -> bool:
        result = await self._session.execute(
            select(func.count())
            .select_from(KnowledgeBaseModel)
            .where(KnowledgeBaseModel.id == knowledge_base_id)
        )
        return result.scalar_one() > 0

    def document_count(self, kb: KnowledgeBaseModel) -> int:
        return len(kb.documents)

    def ready_document_count(self, kb: KnowledgeBaseModel) -> int:
        return sum(1 for doc in kb.documents if doc.status == ProcessingStatus.READY)

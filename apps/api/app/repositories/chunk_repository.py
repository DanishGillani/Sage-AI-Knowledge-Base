from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import ChunkModel


class ChunkRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def insert_many(self, chunks: list[ChunkModel]) -> None:
        self._session.add_all(chunks)
        await self._session.flush()

    async def delete_by_document(self, document_id: str) -> int:
        result = await self._session.execute(
            delete(ChunkModel).where(ChunkModel.document_id == document_id)
        )
        return result.rowcount  # type: ignore[return-value]

    async def count_by_knowledge_base(self, knowledge_base_id: str) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(ChunkModel)
            .where(ChunkModel.knowledge_base_id == knowledge_base_id)
        )
        return result.scalar_one()

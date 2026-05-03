from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import DocumentModel, ProcessingStatus


class DocumentRepository:
    """
    Data access layer for documents table.
    Handles status updates during ingestion — no business logic.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, document_id: str) -> DocumentModel | None:
        result = await self._session.execute(
            select(DocumentModel).where(DocumentModel.id == document_id)
        )
        return result.scalar_one_or_none()

    async def find_by_knowledge_base(self, knowledge_base_id: str) -> list[DocumentModel]:
        result = await self._session.execute(
            select(DocumentModel)
            .where(DocumentModel.knowledge_base_id == knowledge_base_id)
            .order_by(DocumentModel.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_status(
        self,
        document_id: str,
        status: ProcessingStatus,
        *,
        page_count: int | None = None,
        error_message: str | None = None,
    ) -> DocumentModel | None:
        """
        Updates document processing status and optional metadata.
        Returns the updated document, or None if not found.
        """
        doc = await self.find_by_id(document_id)
        if doc is None:
            return None

        doc.status = status
        if page_count is not None:
            doc.page_count = page_count
        if error_message is not None:
            doc.error_message = error_message

        await self._session.flush()
        return doc

    async def mark_processing(self, document_id: str) -> DocumentModel | None:
        return await self.update_status(document_id, ProcessingStatus.PROCESSING)

    async def mark_ready(
        self, document_id: str, page_count: int | None = None
    ) -> DocumentModel | None:
        return await self.update_status(document_id, ProcessingStatus.READY, page_count=page_count)

    async def mark_failed(self, document_id: str, error_message: str) -> DocumentModel | None:
        return await self.update_status(
            document_id,
            ProcessingStatus.FAILED,
            error_message=error_message,
        )

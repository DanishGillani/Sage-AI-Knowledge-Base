from uuid import uuid4

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm import get_embedding_model
from app.models.chunk import ChunkModel
from app.models.document import FileType
from app.repositories.chunk_repository import ChunkRepository
from app.repositories.document_repository import DocumentRepository
from app.services.ingestion.chunker import chunk_pages
from app.services.ingestion.extractor import get_extractor

logger = structlog.get_logger()


class IngestionService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._doc_repo = DocumentRepository(session)
        self._chunk_repo = ChunkRepository(session)

    async def ingest(
        self,
        doc_id: str,
        knowledge_base_id: str,
        file_bytes: bytes,
        filename: str,
        file_type: FileType,
        force_ocr: bool = False,
    ) -> None:
        """
        Full pipeline: extract → chunk → embed → store.
        Updates document status at each stage; marks FAILED on any error.
        """
        log = logger.bind(doc_id=doc_id, filename=filename, file_type=file_type.value)

        try:
            await self._doc_repo.mark_processing(doc_id)
            await self._session.commit()

            log.info("ingestion_extracting", force_ocr=force_ocr)
            extractor = get_extractor(file_type.value, force_ocr=force_ocr)
            pages = await extractor.extract(file_bytes, filename)
            page_count = max(
                (p.page_number for p in pages if p.page_number is not None),
                default=None,
            )

            log.info("ingestion_chunking", page_count=page_count)
            chunks = chunk_pages(pages)
            if not chunks:
                await self._doc_repo.mark_failed(
                    doc_id, "No text content could be extracted from this document."
                )
                await self._session.commit()
                return

            log.info("ingestion_embedding", chunk_count=len(chunks))
            embedding_model = get_embedding_model()
            vectors = await embedding_model.aembed_documents([c.content for c in chunks])

            log.info("ingestion_storing", chunk_count=len(chunks))
            chunk_models = [
                ChunkModel(
                    id=str(uuid4()),
                    document_id=doc_id,
                    knowledge_base_id=knowledge_base_id,
                    content=chunk.content,
                    embedding=vector,
                    page_number=chunk.page_number,
                    chunk_index=chunk.chunk_index,
                    chunk_metadata={"filename": filename},
                )
                for chunk, vector in zip(chunks, vectors, strict=True)
            ]
            await self._chunk_repo.insert_many(chunk_models)
            await self._doc_repo.mark_ready(doc_id, page_count=page_count)
            await self._session.commit()

            log.info("ingestion_complete", chunk_count=len(chunks))

        except Exception as exc:
            log.error("ingestion_failed", error=str(exc))
            await self._session.rollback()
            try:
                await self._doc_repo.mark_failed(doc_id, str(exc)[:500])
                await self._session.commit()
            except Exception:
                log.exception("ingestion_mark_failed_error")

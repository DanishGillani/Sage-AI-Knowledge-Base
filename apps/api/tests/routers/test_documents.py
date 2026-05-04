from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.models.document import ProcessingStatus
from app.schemas.document import DocumentStatusResponse

_HEADERS = {"x-internal-secret": "change-me-in-production"}

_STUB_STATUS = DocumentStatusResponse(
    id="doc-001",
    status=ProcessingStatus.PROCESSING,
    page_count=None,
    error_message=None,
    progress=None,
)


@pytest.mark.asyncio
class TestIngestDocumentRoute:
    async def test_returns_202_and_queues_background_task(self, client: AsyncClient) -> None:
        with patch(
            "app.routers.documents._run_ingestion",
            new_callable=AsyncMock,
        ):
            response = await client.post(
                "/documents/doc-001/ingest",
                headers=_HEADERS,
                files={"file": ("hello.txt", b"Hello world", "text/plain")},
                data={"knowledge_base_id": "kb-001", "file_type": "TXT"},
            )

        assert response.status_code == 202
        body = response.json()
        assert body["id"] == "doc-001"
        assert body["status"] == "PENDING"

    async def test_rejects_missing_internal_secret(self, client: AsyncClient) -> None:
        response = await client.post(
            "/documents/doc-001/ingest",
            files={"file": ("hello.txt", b"Hello world", "text/plain")},
            data={"knowledge_base_id": "kb-001", "file_type": "TXT"},
        )
        assert response.status_code == 401

    async def test_rejects_wrong_internal_secret(self, client: AsyncClient) -> None:
        response = await client.post(
            "/documents/doc-001/ingest",
            headers={"x-internal-secret": "wrong-secret"},
            files={"file": ("hello.txt", b"Hello world", "text/plain")},
            data={"knowledge_base_id": "kb-001", "file_type": "TXT"},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestGetDocumentStatusRoute:
    async def test_returns_status_when_document_exists(self, client: AsyncClient) -> None:
        with patch(
            "app.routers.documents.DocumentRepository.find_by_id",
            new_callable=AsyncMock,
            return_value=_make_doc_model(),
        ):
            response = await client.get("/documents/doc-001/status", headers=_HEADERS)

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == "doc-001"
        assert body["status"] == "PROCESSING"

    async def test_returns_404_when_document_missing(self, client: AsyncClient) -> None:
        with patch(
            "app.routers.documents.DocumentRepository.find_by_id",
            new_callable=AsyncMock,
            return_value=None,
        ):
            response = await client.get("/documents/missing-id/status", headers=_HEADERS)

        assert response.status_code == 404


@pytest.mark.asyncio
class TestDeleteDocumentChunksRoute:
    async def test_returns_204_and_deletes_chunks(self, client: AsyncClient) -> None:
        with patch(
            "app.routers.documents.ChunkRepository.delete_by_document",
            new_callable=AsyncMock,
            return_value=5,
        ):
            response = await client.delete("/documents/doc-001", headers=_HEADERS)

        assert response.status_code == 204


# ── Helpers ────────────────────────────────────────────────────────────────────


def _make_doc_model() -> object:
    from app.models.document import DocumentModel, FileType, ProcessingStatus

    doc = DocumentModel()
    doc.id = "doc-001"
    doc.knowledge_base_id = "kb-001"
    doc.filename = "test.txt"
    doc.file_type = FileType.TXT
    doc.file_size_bytes = 100
    doc.status = ProcessingStatus.PROCESSING
    doc.page_count = None
    doc.error_message = None
    return doc

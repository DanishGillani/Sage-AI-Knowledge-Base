from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.document import FileType
from app.services.ingestion.ingestion_service import IngestionService


@pytest.fixture
def mock_session() -> AsyncMock:
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


@pytest.fixture
def mock_doc_repo() -> MagicMock:
    repo = MagicMock()
    repo.mark_processing = AsyncMock()
    repo.mark_ready = AsyncMock()
    repo.mark_failed = AsyncMock()
    return repo


@pytest.fixture
def mock_chunk_repo() -> MagicMock:
    repo = MagicMock()
    repo.insert_many = AsyncMock()
    return repo


@pytest.fixture
def service(
    mock_session: AsyncMock,
    mock_doc_repo: MagicMock,
    mock_chunk_repo: MagicMock,
    monkeypatch: pytest.MonkeyPatch,
) -> IngestionService:
    svc = IngestionService(mock_session)
    monkeypatch.setattr(svc, "_doc_repo", mock_doc_repo)
    monkeypatch.setattr(svc, "_chunk_repo", mock_chunk_repo)
    return svc


class TestIngestionService:
    async def test_ingest_txt_happy_path(
        self,
        service: IngestionService,
        mock_doc_repo: MagicMock,
        mock_chunk_repo: MagicMock,
    ) -> None:
        file_bytes = b"Hello world. This is a test document with enough content to form a chunk."
        mock_embedding = [0.1] * 768

        with (
            patch(
                "app.services.ingestion.ingestion_service.get_extractor",
                return_value=_make_extractor("Hello world. This is a test document."),
            ),
            patch(
                "app.services.ingestion.ingestion_service.get_embedding_model",
                return_value=_make_embedder([mock_embedding]),
            ),
        ):
            await service.ingest(
                doc_id="doc-001",
                knowledge_base_id="kb-001",
                file_bytes=file_bytes,
                filename="test.txt",
                file_type=FileType.TXT,
            )

        mock_doc_repo.mark_processing.assert_called_once_with("doc-001")
        mock_doc_repo.mark_ready.assert_called_once()
        mock_doc_repo.mark_failed.assert_not_called()
        mock_chunk_repo.insert_many.assert_called_once()

    async def test_ingest_marks_failed_when_extraction_raises(
        self,
        service: IngestionService,
        mock_doc_repo: MagicMock,
    ) -> None:
        with patch(
            "app.services.ingestion.ingestion_service.get_extractor",
            return_value=_make_extractor_error(RuntimeError("PDF is corrupt")),
        ):
            await service.ingest(
                doc_id="doc-002",
                knowledge_base_id="kb-001",
                file_bytes=b"bad data",
                filename="corrupt.pdf",
                file_type=FileType.PDF,
            )

        mock_doc_repo.mark_failed.assert_called_once()
        call_args = mock_doc_repo.mark_failed.call_args
        assert call_args.args[0] == "doc-002"
        assert "PDF is corrupt" in call_args.args[1]

    async def test_ingest_marks_failed_when_no_text_extracted(
        self,
        service: IngestionService,
        mock_doc_repo: MagicMock,
        mock_chunk_repo: MagicMock,
    ) -> None:
        with patch(
            "app.services.ingestion.ingestion_service.get_extractor",
            return_value=_make_extractor(""),  # blank document
        ):
            await service.ingest(
                doc_id="doc-003",
                knowledge_base_id="kb-001",
                file_bytes=b"   ",
                filename="blank.txt",
                file_type=FileType.TXT,
            )

        mock_doc_repo.mark_failed.assert_called_once()
        mock_chunk_repo.insert_many.assert_not_called()

    async def test_ingest_truncates_long_error_message(
        self,
        service: IngestionService,
        mock_doc_repo: MagicMock,
    ) -> None:
        long_error = "x" * 1000
        with patch(
            "app.services.ingestion.ingestion_service.get_extractor",
            return_value=_make_extractor_error(RuntimeError(long_error)),
        ):
            await service.ingest(
                doc_id="doc-004",
                knowledge_base_id="kb-001",
                file_bytes=b"data",
                filename="test.txt",
                file_type=FileType.TXT,
            )

        call_args = mock_doc_repo.mark_failed.call_args
        assert len(call_args.args[1]) <= 500


# ── Helpers ────────────────────────────────────────────────────────────────────


def _make_extractor(text: str) -> MagicMock:
    """Returns a mock extractor that yields a single page with the given text."""
    from app.services.ingestion.extractor import ExtractedPage

    extractor = MagicMock()
    extractor.extract = AsyncMock(return_value=[ExtractedPage(text=text, page_number=None)])
    return extractor


def _make_extractor_error(exc: Exception) -> MagicMock:
    extractor = MagicMock()
    extractor.extract = AsyncMock(side_effect=exc)
    return extractor


def _make_embedder(vectors: list[list[float]]) -> MagicMock:
    embedder = MagicMock()
    embedder.aembed_documents = AsyncMock(return_value=vectors)
    return embedder

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import NotFoundException
from app.models.knowledge_base import KnowledgeBaseModel
from app.repositories.knowledge_base_repository import KnowledgeBaseRepository
from app.services.knowledge_base_service import KnowledgeBaseService


def _make_kb(kb_id: str = "kb-001", name: str = "Test KB") -> KnowledgeBaseModel:
    """Factory for KnowledgeBaseModel test fixtures."""
    kb = KnowledgeBaseModel()
    kb.id = kb_id
    kb.name = name
    kb.description = None
    kb.documents = []
    kb.created_at = datetime(2026, 4, 24, tzinfo=timezone.utc)
    kb.updated_at = datetime(2026, 4, 24, tzinfo=timezone.utc)
    return kb


@pytest.fixture
def mock_session() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def mock_repo() -> MagicMock:
    repo = MagicMock(spec=KnowledgeBaseRepository)
    repo.document_count.return_value = 0
    repo.ready_document_count.return_value = 0
    return repo


@pytest.fixture
def service(mock_session: AsyncMock, mock_repo: MagicMock, monkeypatch: pytest.MonkeyPatch) -> KnowledgeBaseService:
    svc = KnowledgeBaseService(mock_session)
    monkeypatch.setattr(svc, "_repo", mock_repo)
    return svc


class TestListKnowledgeBases:
    async def test_returns_empty_list_when_no_knowledge_bases(
        self, service: KnowledgeBaseService, mock_repo: MagicMock
    ) -> None:
        mock_repo.find_all = AsyncMock(return_value=([], 0))

        result = await service.list_knowledge_bases()

        assert result.items == []
        assert result.total == 0
        assert result.has_next_page is False

    async def test_returns_paginated_list(
        self, service: KnowledgeBaseService, mock_repo: MagicMock
    ) -> None:
        kbs = [_make_kb("kb-001"), _make_kb("kb-002")]
        mock_repo.find_all = AsyncMock(return_value=(kbs, 2))

        result = await service.list_knowledge_bases(page=1, limit=20)

        assert result.total == 2
        assert len(result.items) == 2
        assert result.page == 1
        assert result.has_next_page is False

    async def test_calculates_has_next_page_correctly(
        self, service: KnowledgeBaseService, mock_repo: MagicMock
    ) -> None:
        kbs = [_make_kb(f"kb-{i:03}") for i in range(5)]
        mock_repo.find_all = AsyncMock(return_value=(kbs, 12))

        result = await service.list_knowledge_bases(page=1, limit=5)

        assert result.has_next_page is True

    async def test_maps_document_counts(
        self, service: KnowledgeBaseService, mock_repo: MagicMock
    ) -> None:
        kb = _make_kb()
        mock_repo.find_all = AsyncMock(return_value=([kb], 1))
        mock_repo.document_count.return_value = 4
        mock_repo.ready_document_count.return_value = 3

        result = await service.list_knowledge_bases()

        assert result.items[0].document_count == 4
        assert result.items[0].ready_document_count == 3


class TestGetKnowledgeBase:
    async def test_returns_knowledge_base_when_found(
        self, service: KnowledgeBaseService, mock_repo: MagicMock
    ) -> None:
        kb = _make_kb("kb-001", "Engineering Docs")
        mock_repo.find_by_id = AsyncMock(return_value=kb)

        result = await service.get_knowledge_base("kb-001")

        assert result.id == "kb-001"
        assert result.name == "Engineering Docs"

    async def test_raises_not_found_when_missing(
        self, service: KnowledgeBaseService, mock_repo: MagicMock
    ) -> None:
        mock_repo.find_by_id = AsyncMock(return_value=None)

        with pytest.raises(NotFoundException) as exc_info:
            await service.get_knowledge_base("missing-id")

        assert exc_info.value.code == "NOT_FOUND"
        assert "missing-id" in exc_info.value.message


class TestAssertKnowledgeBaseExists:
    async def test_passes_when_kb_exists(
        self, service: KnowledgeBaseService, mock_repo: MagicMock
    ) -> None:
        mock_repo.exists = AsyncMock(return_value=True)
        # Should not raise
        await service.assert_knowledge_base_exists("kb-001")

    async def test_raises_not_found_when_missing(
        self, service: KnowledgeBaseService, mock_repo: MagicMock
    ) -> None:
        mock_repo.exists = AsyncMock(return_value=False)

        with pytest.raises(NotFoundException):
            await service.assert_knowledge_base_exists("missing-id")

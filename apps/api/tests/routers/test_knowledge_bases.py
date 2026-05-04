from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.core.exceptions import NotFoundException
from app.schemas.knowledge_base import KnowledgeBaseListResponse, KnowledgeBaseResponse

_HEADERS = {"x-internal-secret": "change-me-in-production"}

_STUB_KB = KnowledgeBaseResponse(
    id="kb-001",
    name="Engineering Runbooks",
    description=None,
    document_count=3,
    ready_document_count=2,
    created_at="2026-04-24T00:00:00Z",  # type: ignore[arg-type]
    updated_at="2026-04-24T00:00:00Z",  # type: ignore[arg-type]
)

_STUB_LIST = KnowledgeBaseListResponse(
    items=[_STUB_KB],
    total=1,
    page=1,
    limit=20,
    has_next_page=False,
)


@pytest.mark.asyncio
class TestListKnowledgeBasesRoute:
    async def test_returns_200_with_list(self, client: AsyncClient) -> None:
        with patch(
            "app.services.knowledge_base_service.KnowledgeBaseService.list_knowledge_bases",
            new_callable=AsyncMock,
            return_value=_STUB_LIST,
        ):
            response = await client.get("/knowledge-bases", headers=_HEADERS)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["name"] == "Engineering Runbooks"

    async def test_passes_pagination_params(self, client: AsyncClient) -> None:
        with patch(
            "app.services.knowledge_base_service.KnowledgeBaseService.list_knowledge_bases",
            new_callable=AsyncMock,
            return_value=_STUB_LIST,
        ) as mock_service:
            await client.get("/knowledge-bases?page=2&limit=5", headers=_HEADERS)

        mock_service.assert_called_once_with(page=2, limit=5)

    async def test_rejects_missing_secret(self, client: AsyncClient) -> None:
        response = await client.get("/knowledge-bases")
        assert response.status_code == 401

    async def test_rejects_invalid_page(self, client: AsyncClient) -> None:
        response = await client.get("/knowledge-bases?page=0", headers=_HEADERS)
        assert response.status_code == 422

    async def test_rejects_limit_over_100(self, client: AsyncClient) -> None:
        response = await client.get("/knowledge-bases?limit=101", headers=_HEADERS)
        assert response.status_code == 422


@pytest.mark.asyncio
class TestGetKnowledgeBaseRoute:
    async def test_returns_200_when_found(self, client: AsyncClient) -> None:
        with patch(
            "app.services.knowledge_base_service.KnowledgeBaseService.get_knowledge_base",
            new_callable=AsyncMock,
            return_value=_STUB_KB,
        ):
            response = await client.get("/knowledge-bases/kb-001", headers=_HEADERS)

        assert response.status_code == 200
        assert response.json()["id"] == "kb-001"

    async def test_returns_401_when_secret_missing(self, client: AsyncClient) -> None:
        response = await client.get("/knowledge-bases/kb-001")
        assert response.status_code == 401

    async def test_returns_404_when_not_found(self, client: AsyncClient) -> None:
        with patch(
            "app.services.knowledge_base_service.KnowledgeBaseService.get_knowledge_base",
            new_callable=AsyncMock,
            side_effect=NotFoundException("KnowledgeBase", "missing-id"),
        ):
            response = await client.get("/knowledge-bases/missing-id", headers=_HEADERS)

        assert response.status_code == 404
        body = response.json()
        assert body["code"] == "NOT_FOUND"

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.schemas.chat import ChatResponse, SourceResponse

_HEADERS = {"x-internal-secret": "change-me-in-production"}

_STUB_RESPONSE = ChatResponse(
    content="Deploy via the CI/CD pipeline using blue-green deployment.",
    sources=[
        SourceResponse(
            document_id="doc-001",
            filename="runbook.pdf",
            page_number=3,
            excerpt="Deploy using the standard CI/CD pipeline.",
            similarity_score=0.92,
        )
    ],
)

_CHAT_PAYLOAD = {
    "session_id": "sess-001",
    "message": "What is the deployment process?",
    "knowledge_base_id": "kb-001",
    "mode": "PROFESSIONAL",
    "message_history": [],
}


@pytest.mark.asyncio
class TestChatRoute:
    async def test_returns_200_with_content_and_sources(self, client: AsyncClient) -> None:
        with patch(
            "app.services.chat_service.ChatService.chat",
            new_callable=AsyncMock,
            return_value=_STUB_RESPONSE,
        ):
            response = await client.post("/chat/", headers=_HEADERS, json=_CHAT_PAYLOAD)

        assert response.status_code == 200
        body = response.json()
        assert body["content"] == _STUB_RESPONSE.content
        assert len(body["sources"]) == 1
        assert body["sources"][0]["document_id"] == "doc-001"
        assert body["sources"][0]["similarity_score"] == 0.92

    async def test_rejects_missing_secret(self, client: AsyncClient) -> None:
        response = await client.post("/chat/", json=_CHAT_PAYLOAD)
        assert response.status_code == 401

    async def test_rejects_wrong_secret(self, client: AsyncClient) -> None:
        response = await client.post(
            "/chat/",
            headers={"x-internal-secret": "wrong"},
            json=_CHAT_PAYLOAD,
        )
        assert response.status_code == 401

    async def test_returns_503_when_ollama_unavailable(self, client: AsyncClient) -> None:
        from app.core.exceptions import OllamaUnavailableException

        with patch(
            "app.services.chat_service.ChatService.chat",
            new_callable=AsyncMock,
            side_effect=OllamaUnavailableException(),
        ):
            response = await client.post("/chat/", headers=_HEADERS, json=_CHAT_PAYLOAD)

        assert response.status_code == 503
        assert response.json()["code"] == "OLLAMA_UNAVAILABLE"

    async def test_rejects_message_over_10000_chars(self, client: AsyncClient) -> None:
        response = await client.post(
            "/chat/",
            headers=_HEADERS,
            json={**_CHAT_PAYLOAD, "message": "x" * 10_001},
        )
        assert response.status_code == 422

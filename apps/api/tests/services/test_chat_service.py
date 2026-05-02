from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.chunk import ChunkModel
from app.schemas.chat import ChatRequest, MessageHistoryItem
from app.services.chat_service import ChatService


@pytest.fixture
def mock_session() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def chat_request() -> ChatRequest:
    return ChatRequest(
        session_id="sess-001",
        message="What is the deployment process?",
        knowledge_base_id="kb-001",
        mode="PROFESSIONAL",
        message_history=[],
    )


@pytest.fixture
def service(mock_session: AsyncMock, monkeypatch: pytest.MonkeyPatch) -> ChatService:
    svc = ChatService(mock_session)
    monkeypatch.setattr(svc, "_vector_repo", _make_vector_repo([(_make_chunk(), 0.92)]))
    return svc


class TestChatService:
    async def test_returns_content_and_sources(
        self,
        service: ChatService,
        chat_request: ChatRequest,
    ) -> None:
        with (
            patch(
                "app.services.chat_service.get_embedding_model",
                return_value=_make_embedder([0.1] * 768),
            ),
            patch(
                "app.services.chat_service.get_chat_model",
                return_value=_make_llm("Deploy via CI/CD pipeline."),
            ),
        ):
            result = await service.chat(chat_request)

        assert result.content == "Deploy via CI/CD pipeline."
        assert len(result.sources) == 1
        assert result.sources[0].document_id == "doc-001"
        assert result.sources[0].filename == "runbook.pdf"
        assert 0.0 <= result.sources[0].similarity_score <= 1.0

    async def test_passes_message_history_to_llm(
        self,
        mock_session: AsyncMock,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        svc = ChatService(mock_session)
        monkeypatch.setattr(svc, "_vector_repo", _make_vector_repo([]))

        captured_messages: list[object] = []

        async def _fake_invoke(messages: list[object]) -> object:
            captured_messages.extend(messages)
            result = MagicMock()
            result.content = "response"
            return result

        llm = MagicMock()
        llm.ainvoke = _fake_invoke

        with (
            patch(
                "app.services.chat_service.get_embedding_model",
                return_value=_make_embedder([0.0] * 768),
            ),
            patch("app.services.chat_service.get_chat_model", return_value=llm),
        ):
            await svc.chat(
                ChatRequest(
                    session_id="s",
                    message="follow-up",
                    knowledge_base_id="kb-001",
                    mode="CASUAL",
                    message_history=[
                        MessageHistoryItem(role="USER", content="previous question"),
                        MessageHistoryItem(role="ASSISTANT", content="previous answer"),
                    ],
                )
            )

        # SystemMessage + 2 history + 1 current = 4 messages
        assert len(captured_messages) == 4

    async def test_empty_kb_returns_no_sources(
        self,
        mock_session: AsyncMock,
        monkeypatch: pytest.MonkeyPatch,
        chat_request: ChatRequest,
    ) -> None:
        svc = ChatService(mock_session)
        monkeypatch.setattr(svc, "_vector_repo", _make_vector_repo([]))

        with (
            patch(
                "app.services.chat_service.get_embedding_model",
                return_value=_make_embedder([0.0] * 768),
            ),
            patch(
                "app.services.chat_service.get_chat_model",
                return_value=_make_llm("I don't have enough information."),
            ),
        ):
            result = await service.chat(chat_request)

        assert result.sources == []

    async def test_raises_ollama_unavailable_on_connect_error(
        self,
        service: ChatService,
        chat_request: ChatRequest,
    ) -> None:
        import httpx

        from app.core.exceptions import OllamaUnavailableException

        with (
            patch(
                "app.services.chat_service.get_embedding_model",
                return_value=_make_embedder([0.1] * 768),
            ),
            patch(
                "app.services.chat_service.get_chat_model",
                return_value=_make_llm_error(httpx.ConnectError("refused")),
            ),
            pytest.raises(OllamaUnavailableException),
        ):
            await service.chat(chat_request)

    async def test_clips_similarity_score_to_unit_interval(
        self,
        mock_session: AsyncMock,
        monkeypatch: pytest.MonkeyPatch,
        chat_request: ChatRequest,
    ) -> None:
        # Score > 1 should be clamped to 1.0
        svc = ChatService(mock_session)
        monkeypatch.setattr(svc, "_vector_repo", _make_vector_repo([(_make_chunk(), 1.05)]))

        with (
            patch(
                "app.services.chat_service.get_embedding_model",
                return_value=_make_embedder([0.1] * 768),
            ),
            patch(
                "app.services.chat_service.get_chat_model",
                return_value=_make_llm("ok"),
            ),
        ):
            result = await svc.chat(chat_request)

        assert result.sources[0].similarity_score <= 1.0


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_chunk(
    doc_id: str = "doc-001",
    filename: str = "runbook.pdf",
    page: int | None = 3,
) -> ChunkModel:
    chunk = ChunkModel()
    chunk.id = "chunk-001"
    chunk.document_id = doc_id
    chunk.knowledge_base_id = "kb-001"
    chunk.content = "Deploy using the standard CI/CD pipeline with blue-green deployment."
    chunk.page_number = page
    chunk.chunk_index = 0
    chunk.chunk_metadata = {"filename": filename}
    return chunk


def _make_vector_repo(
    results: list[tuple[ChunkModel, float]],
) -> MagicMock:
    repo = MagicMock()
    repo.similarity_search = AsyncMock(return_value=results)
    return repo


def _make_embedder(vector: list[float]) -> MagicMock:
    embedder = MagicMock()
    embedder.aembed_query = AsyncMock(return_value=vector)
    return embedder


def _make_llm(content: str) -> MagicMock:
    response = MagicMock()
    response.content = content
    llm = MagicMock()
    llm.ainvoke = AsyncMock(return_value=response)
    return llm


def _make_llm_error(exc: Exception) -> MagicMock:
    llm = MagicMock()
    llm.ainvoke = AsyncMock(side_effect=exc)
    return llm

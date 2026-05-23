import json
from collections.abc import AsyncGenerator

import structlog
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.exceptions import OllamaUnavailableException
from app.core.security import verify_internal
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService

logger = structlog.get_logger()
router = APIRouter()


@router.post("/", response_model=ChatResponse, dependencies=[Depends(verify_internal)])
async def chat(
    request: ChatRequest,
    session: AsyncSession = Depends(get_db_session),
) -> ChatResponse:
    """
    RAG query endpoint — called exclusively by the BFF.
    Embeds the query, retrieves similar chunks, calls the LLM, returns content + sources.
    """
    return await ChatService(session).chat(request)


@router.post("/stream/", dependencies=[Depends(verify_internal)])
async def chat_stream(
    request: ChatRequest,
    session: AsyncSession = Depends(get_db_session),
) -> StreamingResponse:
    """SSE streaming variant — yields tokens as the LLM generates them."""

    async def generate() -> AsyncGenerator[str, None]:
        try:
            async for event in ChatService(session).stream_chat(request):
                yield f"data: {event}\n\n"
        except OllamaUnavailableException:
            msg = "AI model is unavailable. Make sure Ollama is running."
            yield f"data: {json.dumps({'type': 'error', 'message': msg})}\n\n"
        except Exception as exc:
            logger.error("chat_stream_error", error=str(exc))
            msg = "Stream failed unexpectedly."
            yield f"data: {json.dumps({'type': 'error', 'message': msg})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

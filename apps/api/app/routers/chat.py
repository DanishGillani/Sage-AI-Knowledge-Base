import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
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

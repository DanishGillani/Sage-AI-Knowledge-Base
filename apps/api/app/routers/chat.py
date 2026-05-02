import structlog
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.database import get_db_session
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService

logger = structlog.get_logger()
router = APIRouter()


async def _verify_internal(x_internal_secret: str = Header(...)) -> None:
    if x_internal_secret != get_settings().api_internal_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/", response_model=ChatResponse, dependencies=[Depends(_verify_internal)])
async def chat(
    request: ChatRequest,
    session: AsyncSession = Depends(get_db_session),
) -> ChatResponse:
    """
    RAG query endpoint — called exclusively by the BFF.
    Embeds the query, retrieves similar chunks, calls the LLM, returns content + sources.
    """
    return await ChatService(session).chat(request)

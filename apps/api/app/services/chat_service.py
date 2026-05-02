import httpx
import structlog
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.exceptions import OllamaUnavailableException
from app.core.llm import get_chat_model, get_embedding_model
from app.core.prompts import CONTEXT_BLOCK, RESPONSE_MODE_SYSTEM_PROMPTS
from app.repositories.vector_search_repository import VectorSearchRepository
from app.schemas.chat import ChatRequest, ChatResponse, SourceResponse

logger = structlog.get_logger()


class ChatService:
    def __init__(self, session: AsyncSession) -> None:
        self._vector_repo = VectorSearchRepository(session)

    async def chat(self, request: ChatRequest) -> ChatResponse:
        """
        Full RAG pipeline: embed query → retrieve chunks → build prompt → call LLM → return.
        """
        log = logger.bind(session_id=request.session_id, kb_id=request.knowledge_base_id)

        # 1. Embed the user query
        log.info("chat_embedding_query")
        embedding_model = get_embedding_model()
        query_embedding = await embedding_model.aembed_query(request.message)

        # 2. Retrieve similar chunks
        log.info("chat_vector_search")
        settings = get_settings()
        chunks_with_scores = await self._vector_repo.similarity_search(
            knowledge_base_id=request.knowledge_base_id,
            query_embedding=query_embedding,
            top_k=settings.retrieval_top_k,
        )
        log.info("chat_chunks_retrieved", count=len(chunks_with_scores))

        # 3. Build context block
        if chunks_with_scores:
            context_parts = []
            for chunk, _ in chunks_with_scores:
                header = f"[Document: {chunk.chunk_metadata.get('filename', 'unknown')}"
                if chunk.page_number is not None:
                    header += f", Page {chunk.page_number}"
                header += "]"
                context_parts.append(f"{header}\n{chunk.content}")
            context = "\n\n".join(context_parts)
        else:
            context = "No relevant documents found in the knowledge base."

        # 4. Build LangChain message list
        system_prompt = (
            RESPONSE_MODE_SYSTEM_PROMPTS[request.mode]
            + CONTEXT_BLOCK.format(context=context)
        )
        messages: list[SystemMessage | HumanMessage | AIMessage] = [
            SystemMessage(content=system_prompt)
        ]
        for item in request.message_history:
            if item.role == "USER":
                messages.append(HumanMessage(content=item.content))
            else:
                messages.append(AIMessage(content=item.content))
        messages.append(HumanMessage(content=request.message))

        # 5. Call LLM
        log.info("chat_llm_invoke", mode=request.mode)
        chat_model = get_chat_model()
        try:
            response = await chat_model.ainvoke(messages)
        except httpx.ConnectError:
            raise OllamaUnavailableException()

        # 6. Build typed sources
        sources = [
            SourceResponse(
                document_id=chunk.document_id,
                filename=chunk.chunk_metadata.get("filename", "unknown"),
                page_number=chunk.page_number,
                excerpt=chunk.content[:300],
                similarity_score=round(min(max(score, 0.0), 1.0), 4),
            )
            for chunk, score in chunks_with_scores
        ]

        log.info("chat_complete", source_count=len(sources))
        return ChatResponse(content=str(response.content), sources=sources)

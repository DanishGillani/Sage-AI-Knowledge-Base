from functools import lru_cache

import structlog
from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel

from app.config import Settings, get_settings

logger = structlog.get_logger()


@lru_cache
def get_chat_model(settings: Settings | None = None) -> BaseChatModel:
    """
    Returns a LangChain chat model based on AI_PROVIDER config.
    Switching from Ollama to OpenAI is a single env var change — no code changes.
    """
    resolved = settings or get_settings()

    if resolved.ai_provider == "openai":
        from langchain_openai import ChatOpenAI

        logger.info("llm_provider_openai", model=resolved.openai_chat_model)
        return ChatOpenAI(
            model=resolved.openai_chat_model,
            api_key=resolved.openai_api_key,  # type: ignore[arg-type]
            streaming=True,
        )

    from langchain_ollama import ChatOllama

    logger.info("llm_provider_ollama", model=resolved.ollama_chat_model)
    return ChatOllama(
        model=resolved.ollama_chat_model,
        base_url=resolved.ollama_base_url,
    )


@lru_cache
def get_embedding_model(settings: Settings | None = None) -> Embeddings:
    """Returns the configured embedding model. Same provider-agnostic pattern as chat."""
    resolved = settings or get_settings()

    if resolved.ai_provider == "openai":
        from langchain_openai import OpenAIEmbeddings

        logger.info("embeddings_provider_openai", model=resolved.openai_embed_model)
        return OpenAIEmbeddings(
            model=resolved.openai_embed_model,
            api_key=resolved.openai_api_key,  # type: ignore[arg-type]
        )

    from langchain_ollama import OllamaEmbeddings

    logger.info("embeddings_provider_ollama", model=resolved.ollama_embed_model)
    return OllamaEmbeddings(
        model=resolved.ollama_embed_model,
        base_url=resolved.ollama_base_url,
    )


def get_vision_model(settings: Settings | None = None) -> BaseChatModel:
    """Vision model used for OCR on scanned PDFs and images — always Ollama locally."""
    resolved = settings or get_settings()

    from langchain_ollama import ChatOllama

    logger.info("vision_provider_ollama", model=resolved.ollama_vision_model)
    return ChatOllama(
        model=resolved.ollama_vision_model,
        base_url=resolved.ollama_base_url,
    )

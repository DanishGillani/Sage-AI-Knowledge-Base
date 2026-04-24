from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    environment: Literal["development", "production", "test"] = "development"

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://sage:sage@localhost:5432/sage"

    # ── AI Provider ───────────────────────────────────────────────────────────
    # Set to "openai" to switch the entire AI layer to OpenAI with no code changes
    ai_provider: Literal["ollama", "openai"] = "ollama"

    # ── Ollama (local, free) ──────────────────────────────────────────────────
    ollama_base_url: str = "http://localhost:11434"
    ollama_chat_model: str = "llama3.1:8b"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_vision_model: str = "qwen2.5-vl:7b"

    # ── OpenAI (optional) ─────────────────────────────────────────────────────
    openai_api_key: str = ""
    openai_chat_model: str = "gpt-4o"
    openai_embed_model: str = "text-embedding-3-small"

    # ── RAG tuning ────────────────────────────────────────────────────────────
    chunk_size: int = 512
    chunk_overlap: int = 50
    retrieval_top_k: int = 5

    # ── Security ──────────────────────────────────────────────────────────────
    api_internal_secret: str = "change-me-in-production"

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

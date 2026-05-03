from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.core.exceptions import AppException
from app.core.logger import setup_logging
from app.routers import chat, documents, health, knowledge_bases

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    setup_logging()
    logger.info(
        "sage_api_starting",
        environment=settings.environment,
        ai_provider=settings.ai_provider,
    )
    yield
    logger.info("sage_api_stopping")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Sage API",
        description="AI Knowledge Base — RAG pipeline service",
        version="0.1.0",
        lifespan=lifespan,
        # Disable docs in production — no need to expose internals
        docs_url="/docs" if settings.environment == "development" else None,
        redoc_url="/redoc" if settings.environment == "development" else None,
    )

    # ── Middleware ─────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ─────────────────────────────────────────────────────
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        logger.warning(
            "app_exception",
            code=exc.code,
            message=exc.message,
            path=request.url.path,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": exc.code, "message": exc.message, "details": exc.details},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("unhandled_exception", error=str(exc), path=request.url.path)
        return JSONResponse(
            status_code=500,
            content={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"},
        )

    # ── Routers ────────────────────────────────────────────────────────────────
    app.include_router(health.router, prefix="/health")
    app.include_router(
        knowledge_bases.router,
        prefix="/knowledge-bases",
        tags=["knowledge-bases"],
    )
    app.include_router(
        documents.router,
        prefix="/documents",
        tags=["documents"],
    )
    app.include_router(
        chat.router,
        prefix="/chat",
        tags=["chat"],
    )

    return app


app = create_app()

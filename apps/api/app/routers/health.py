import httpx
import structlog
from fastapi import APIRouter
from pydantic import BaseModel

from app.config import get_settings
from app.core.database import engine

logger = structlog.get_logger()

router = APIRouter()


class ServiceStatus(BaseModel):
    status: str  # "ok" | "degraded" | "down"
    detail: str | None = None


class HealthResponse(BaseModel):
    status: str
    environment: str
    services: dict[str, ServiceStatus]


@router.get("", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """
    Deep health check — verifies all downstream dependencies.
    Returns 200 even when degraded so load balancers keep routing;
    callers inspect `status` to detect partial failures.
    """
    settings = get_settings()
    services: dict[str, ServiceStatus] = {}

    # ── Database ──────────────────────────────────────────────────────────────
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        services["database"] = ServiceStatus(status="ok")
    except Exception as exc:
        logger.error("health_db_failed", error=str(exc))
        services["database"] = ServiceStatus(status="down", detail=str(exc))

    # ── Ollama ────────────────────────────────────────────────────────────────
    if settings.ai_provider == "ollama":
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{settings.ollama_base_url}/api/tags")
                resp.raise_for_status()
            services["ollama"] = ServiceStatus(status="ok")
        except Exception as exc:
            logger.warning("health_ollama_failed", error=str(exc))
            services["ollama"] = ServiceStatus(
                status="down",
                detail="Ollama unavailable — run `ollama serve`",
            )

    overall = "ok" if all(s.status == "ok" for s in services.values()) else "degraded"

    logger.info("health_check", status=overall, services={k: v.status for k, v in services.items()})
    return HealthResponse(
        status=overall,
        environment=settings.environment,
        services=services,
    )

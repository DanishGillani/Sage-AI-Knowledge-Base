import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.config import get_settings


@pytest.fixture
def settings() -> object:
    return get_settings()


@pytest.fixture
async def client() -> AsyncClient:
    """Async test client wired directly to the FastAPI app — no network required."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

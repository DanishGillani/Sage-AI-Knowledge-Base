import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.main import app


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

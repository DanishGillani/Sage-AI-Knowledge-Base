import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_200(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_response_shape(client: AsyncClient) -> None:
    response = await client.get("/health")
    data = response.json()

    assert "status" in data
    assert "environment" in data
    assert "services" in data
    assert data["status"] in ("ok", "degraded", "down")


@pytest.mark.asyncio
async def test_health_includes_database_status(client: AsyncClient) -> None:
    response = await client.get("/health")
    data = response.json()

    assert "database" in data["services"]
    assert "status" in data["services"]["database"]

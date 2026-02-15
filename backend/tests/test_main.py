"""Tests for app.main (FastAPI application)"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.session import get_db


# Override db dependency for all tests in this module
async def override_get_db():
    mock_db = AsyncMock()
    yield mock_db


app.dependency_overrides[get_db] = override_get_db


class TestRootEndpoint:
    """Tests for the root (/) endpoint."""

    @pytest.mark.asyncio
    async def test_read_root(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Welcome to DocRelief AI"


class TestHealthCheckEndpoint:
    """Tests for the /health endpoint."""

    @pytest.mark.asyncio
    async def test_health_check_healthy(self):
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"

        # Restore default override
        app.dependency_overrides[get_db] = override_get_db

    @pytest.mark.asyncio
    async def test_health_check_unhealthy(self):
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(side_effect=Exception("Connection refused"))

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["database"] == "disconnected"
        assert "Connection refused" in data["error"]

        # Restore default override
        app.dependency_overrides[get_db] = override_get_db

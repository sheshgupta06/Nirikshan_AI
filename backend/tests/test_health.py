import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_health_check_endpoint():
    """Verify that GET /api/v1/health returns HTTP 200 and {'status': 'ok'}."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data == {"status": "ok"}


@pytest.mark.asyncio
async def test_root_endpoint():
    """Verify that GET / returns HTTP 200 with API status information."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "Nirikshan AI API is running" in data["message"]
        assert data["health_check"] == "/api/v1/health"

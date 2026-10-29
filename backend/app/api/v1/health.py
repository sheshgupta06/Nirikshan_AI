import os
import httpx
from fastapi import APIRouter
from backend.app.db.session import is_database_connected

router = APIRouter()


@router.get("/health", summary="Health Check")
async def health_check():
    """Returns the operational status of the Nirikshan AI backend service and database."""
    db_status = is_database_connected()
    return {
        "status": "ok",
        "service": "Nirikshan AI Backend",
        "database": db_status,
    }


@router.get("/health/gemini", summary="Gemini AI Health Check")
async def gemini_health_check():
    """Tests the Google AI Studio Gemini API connection and model availability."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        return {
            "configured": False,
            "status": "not_configured",
            "message": "GEMINI_API_KEY is not set in environment variables. Fallback Clinical Engine is active.",
            "mode": "FALLBACK_CLINICAL_ENGINE",
        }

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={key}"
    payload = {
        "contents": [{"parts": [{"text": "Say 'OK' in one word"}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 10},
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(endpoint, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                reply = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                    .strip()
                )
                return {
                    "configured": True,
                    "status": "connected",
                    "http_status": 200,
                    "model": "gemini-flash-latest",
                    "response": reply,
                    "message": "Google AI Studio Gemini API is active and working perfectly!",
                }
            else:
                return {
                    "configured": True,
                    "status": "api_error",
                    "http_status": resp.status_code,
                    "error_detail": resp.text[:200],
                    "message": f"Gemini API returned status {resp.status_code}. Fallback Clinical Engine will be used.",
                }
    except Exception as exc:
        return {
            "configured": True,
            "status": "network_timeout_or_error",
            "error_detail": str(exc),
            "message": "Request timed out or network blocked. Fallback Clinical Engine will be used.",
        }

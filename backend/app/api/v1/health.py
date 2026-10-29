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

    candidate_models = [
        "gemini-flash-lite-latest",
        "gemini-flash-latest",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
    ]

    last_error = None
    last_status = 500

    payload = {
        "contents": [{"parts": [{"text": "Say 'OK' in one word"}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 10},
    }

    async with httpx.AsyncClient(timeout=5.0) as client:
        for model in candidate_models:
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            try:
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
                        "active_model": model,
                        "response": reply,
                        "message": f"Google AI Studio Gemini API is active and working perfectly on '{model}'!",
                    }
                else:
                    last_status = resp.status_code
                    last_error = resp.text[:200]
                    # If 503 or 429, continue to next candidate model
                    if resp.status_code in (503, 429, 404):
                        continue
            except Exception as exc:
                last_error = str(exc)

    return {
        "configured": True,
        "status": "api_error",
        "http_status": last_status,
        "error_detail": last_error,
        "message": f"Gemini API returned status {last_status}. Fallback Clinical Engine is active and protecting scans.",
    }

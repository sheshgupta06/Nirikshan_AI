import os
import httpx
from fastapi import APIRouter, File, UploadFile
from backend.app.db.session import is_database_connected

router = APIRouter()


@router.get("/health", summary="Health Check")
async def health_check():
    """Returns the operational status of the Nirikshan AI backend service and database."""
    db_status = is_database_connected()
    return {
        "status": "ok",
        "service": "Nirikshan AI Backend",
        "build_version": "v2.1-gemini-vision",
        "database": db_status,
    }


@router.post("/health/vision-debug", summary="Debug Gemini Vision with Real Uploaded File")
async def vision_debug_upload(file: UploadFile = File(...)):
    import base64
    import cv2
    import numpy as np
    key = os.getenv("GEMINI_API_KEY", "").strip()
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        return {"error": "Failed to decode image bytes"}

    h, w = img.shape[:2]
    max_dim = 1024
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        img = cv2.resize(img, (int(round(w * scale)), int(round(h * scale))), interpolation=cv2.INTER_AREA)

    _, enc = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    b64 = base64.b64encode(enc.tobytes()).decode("utf-8")

    prompt = (
        "Extract all text visible on this packaged food label verbatim. "
        "List all ingredients, nutrition facts, allergens, FSSAI lic no, MRP, and dates clearly line by line."
    )
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
                ]
            }
        ],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048},
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={key}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.post(url, json=payload)
            data = r.json() if r.status_code == 200 else {}
            reply = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return {
                "http_status": r.status_code,
                "extracted_text": reply,
                "raw_error": r.text[:500] if r.status_code != 200 else None,
            }
        except Exception as e:
            return {"exception": repr(e)}


@router.get("/health/vision", summary="Gemini Vision Test")
async def vision_test():
    import base64
    import cv2
    import numpy as np
    key = os.getenv("GEMINI_API_KEY", "").strip()
    img = np.ones((50, 150, 3), dtype=np.uint8) * 255
    cv2.putText(img, "MAGGI NOODLES", (5, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    _, enc = cv2.imencode(".jpg", img)
    b64 = base64.b64encode(enc.tobytes()).decode("utf-8")

    results = {}
    candidate_models = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
    ]
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": "Extract all text verbatim:"},
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
                ]
            }
        ],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 30},
    }
    async with httpx.AsyncClient(timeout=4.0) as client:
        for m in candidate_models:
            ep = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}"
            try:
                r = await client.post(ep, json=payload)
                results[m] = {"status": r.status_code, "text": r.text[:120]}
            except Exception as e:
                results[m] = {"error": str(e)}
    return results


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

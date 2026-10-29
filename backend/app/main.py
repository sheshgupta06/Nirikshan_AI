from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.scan import router as scan_router
from backend.app.api.v1.scans_db import router as db_scans_router
from backend.app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database tables on application startup."""
    init_db()
    yield


app = FastAPI(
    title="Nirikshan AI Backend",
    description="Backend API for Nirikshan AI - India-first food label analysis",
    version="0.1.0",
    lifespan=lifespan,
)

# Enable CORS for local development and production deployments (Vercel, Render, Cloud Run)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_origin_regex=r"^https://.*\.vercel\.app$|^https://.*\.onrender\.com$|^https://.*\.run\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routes
app.include_router(health_router, prefix="/api/v1")
app.include_router(scan_router, prefix="/api/v1")
app.include_router(db_scans_router, prefix="/api/v1")

# PRD Section 12.3 Endpoints
from backend.app.api.v1.scan import scan_food_label_image, ScanImageResponse
from backend.app.api.v1.health import health_check

app.add_api_route(
    "/api/v1/analyze",
    scan_food_label_image,
    methods=["POST"],
    response_model=ScanImageResponse,
    summary="Screen Packaged Food Label Image (PRD Section 12.3)",
    tags=["PRD Analysis"],
)
app.add_api_route(
    "/health",
    health_check,
    methods=["GET"],
    summary="Health Check Gateway (PRD Section 12.3)",
    tags=["Health"],
)


@app.get("/", summary="Root Index")
async def root():
    return {
        "message": "Nirikshan AI API is running",
        "docs_url": "/docs",
        "health_check": "/api/v1/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)

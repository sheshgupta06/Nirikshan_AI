from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.scan import router as scan_router

app = FastAPI(
    title="Nirikshan AI Backend",
    description="Backend API for Nirikshan AI - India-first food label analysis",
    version="0.1.0",
)

# Enable CORS for local development (Vite frontend on default ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routes
app.include_router(health_router, prefix="/api/v1")
app.include_router(scan_router, prefix="/api/v1")


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

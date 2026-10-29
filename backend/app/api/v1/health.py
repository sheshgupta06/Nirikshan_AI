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

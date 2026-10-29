"""Nirikshan AI - Database Session and Supabase PostgreSQL / SQLite Configuration.

Automatically supports Supabase direct PostgreSQL pooling or local SQLite fallback.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

# Load environment variables from root and backend .env files
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "backend" / ".env")

DEFAULT_DB_PATH = BASE_DIR / "data" / "nirikshan.db"
DEFAULT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# Check for Supabase PostgreSQL URI or standard DATABASE_URL
raw_db_url = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL")

if raw_db_url and raw_db_url.strip():
    raw_db_url = raw_db_url.strip()
    # Supabase gives postgres:// which SQLAlchemy 2.0 requires as postgresql://
    if raw_db_url.startswith("postgres://"):
        raw_db_url = "postgresql://" + raw_db_url[len("postgres://") :]
    elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+psycopg2://"):
        # Explicit psycopg2 dialect ensures stable binary driver usage
        raw_db_url = "postgresql+psycopg2://" + raw_db_url[len("postgresql://") :]
    ACTIVE_DATABASE_URL = raw_db_url
    IS_POSTGRES = True
else:
    ACTIVE_DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH}"
    IS_POSTGRES = False

# Configure engine with pooling and timeouts
try:
    if IS_POSTGRES:
        engine = create_engine(
            ACTIVE_DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=10,
            max_overflow=20,
            connect_args={"connect_timeout": 10},
        )
        logger.info("Initialized Supabase PostgreSQL database engine.")
    else:
        engine = create_engine(
            ACTIVE_DATABASE_URL,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )
        logger.info("Initialized local SQLite database engine at %s", DEFAULT_DB_PATH)
except Exception as exc:
    logger.warning(
        "Failed to initialize PostgreSQL engine with configured URI (%s). Falling back to SQLite.",
        exc,
    )
    ACTIVE_DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH}"
    IS_POSTGRES = False
    engine = create_engine(
        ACTIVE_DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator:
    """FastAPI dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def is_database_connected() -> dict[str, str | bool | None]:
    """Tests active database connectivity and returns metadata."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "connected": True,
            "engine": "postgresql" if IS_POSTGRES else "sqlite",
            "is_supabase": IS_POSTGRES,
            "error": None,
        }
    except Exception as exc:
        return {
            "connected": False,
            "engine": "postgresql" if IS_POSTGRES else "sqlite",
            "is_supabase": IS_POSTGRES,
            "error": str(exc),
        }


def init_db() -> bool:
    """Creates all tables if they do not exist. Returns True on success."""
    try:
        from backend.app.db import models  # noqa: F401

        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified successfully.")
        return True
    except Exception as exc:
        logger.error("Failed to initialize database tables: %s", exc)
        return False

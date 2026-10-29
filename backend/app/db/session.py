"""Nirikshan AI - Database Session and Engine Configuration."""

import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DEFAULT_DB_PATH = BASE_DIR / "data" / "nirikshan.db"
DEFAULT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Creates all tables if they do not exist."""
    from backend.app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

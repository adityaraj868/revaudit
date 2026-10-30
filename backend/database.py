import os
from typing import Generator
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from .env file
load_dotenv()

# Neon and PostgreSQL connection strings
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./revaudit.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Connection engine parameters
# For Neon serverless PostgreSQL, pool_pre_ping ensures connections aren't lost
# during compute scale-down/idle periods, and pool_recycle keeps connections fresh.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # Ensure sslmode is present for Neon if not already specified in the URL
    connect_args = {}
    if "neon.tech" in DATABASE_URL and "sslmode" not in DATABASE_URL:
        connect_args["sslmode"] = "require"

    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=10,
        max_overflow=20,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_schema() -> None:
    """Create new tables and add Phase 2 columns to existing installations.

    ``create_all`` is intentionally kept for fresh local/Neon branches. The
    small additive migration below keeps an existing prototype database usable
    after the OAuth, review-event, and workload fields are introduced.
    """
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    additions = {
        "pull_requests": {
            "first_review_at": "TIMESTAMP",
            "time_to_first_review_hours": "FLOAT",
            "reviewer_login": "VARCHAR(255)",
            "reviewer_workload": "INTEGER DEFAULT 0",
            "review_count": "INTEGER DEFAULT 0",
            "review_rounds": "INTEGER DEFAULT 0",
            "reviews_synced_at": "TIMESTAMP",
        },
        "review_events": {
            "github_review_id": "INTEGER",
            "body": "TEXT",
            "reviewer_workload": "INTEGER DEFAULT 0",
        },
    }

    with engine.begin() as connection:
        for table_name, columns in additions.items():
            existing_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            }
            for column_name, column_type in columns.items():
                if column_name not in existing_columns:
                    connection.execute(
                        text(
                            f"ALTER TABLE {table_name} "
                            f"ADD COLUMN {column_name} {column_type}"
                        )
                    )


def get_db() -> Generator:
    """FastAPI dependency for yielding database session with automatic closure."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

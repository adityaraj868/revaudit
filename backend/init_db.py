import sys
from database import Base, DATABASE_URL, engine, ensure_schema
import models  # Ensure all models are registered with Base.metadata


def init_db():
    print(f"Connecting to database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    print("Creating relational schema tables (repositories, users, pull_requests, review_events)...")
    ensure_schema()
    print("✓ All tables created successfully!")


if __name__ == "__main__":
    try:
        init_db()
    except Exception as e:
        print(f"Failed to initialize database: {e}", file=sys.stderr)
        sys.exit(1)

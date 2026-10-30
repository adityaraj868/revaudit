"""GitHub OAuth session helpers for the FastAPI application."""

from __future__ import annotations

import base64
import hashlib
import os
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from models import AuthSession, User


@dataclass
class AuthContext:
    user: User
    access_token: str


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def session_hash(session_id: str) -> str:
    return hashlib.sha256(session_id.encode("utf-8")).hexdigest()


def _cipher():
    """Create a deterministic Fernet key from the deployment secret."""
    try:
        from cryptography.fernet import Fernet
    except ImportError as exc:  # pragma: no cover - dependency is installed in deployment
        raise RuntimeError(
            "OAuth token encryption requires the 'cryptography' package."
        ) from exc

    secret = os.getenv("SESSION_SECRET", "dev-only-change-me")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode("utf-8")).digest())
    return Fernet(key)


def create_auth_session(
    db: Session,
    user: User,
    access_token: str,
    duration_days: int = 30,
) -> str:
    session_id = secrets.token_urlsafe(32)
    encrypted_token = _cipher().encrypt(access_token.encode("utf-8")).decode("utf-8")
    db.add(
        AuthSession(
            session_hash=session_hash(session_id),
            user_id=user.id,
            encrypted_access_token=encrypted_token,
            expires_at=utc_now() + timedelta(days=duration_days),
        )
    )
    db.commit()
    return session_id


def resolve_auth_session(db: Session, session_id: Optional[str]) -> Optional[AuthContext]:
    if not session_id:
        return None

    session = (
        db.query(AuthSession)
        .filter(AuthSession.session_hash == session_hash(session_id))
        .first()
    )
    if not session or as_utc(session.expires_at) <= utc_now():
        if session:
            db.delete(session)
            db.commit()
        return None

    try:
        access_token = _cipher().decrypt(
            session.encrypted_access_token.encode("utf-8")
        ).decode("utf-8")
    except Exception:
        return None
    return AuthContext(user=session.user, access_token=access_token)


def revoke_auth_session(db: Session, session_id: Optional[str]) -> None:
    if not session_id:
        return
    session = (
        db.query(AuthSession)
        .filter(AuthSession.session_hash == session_hash(session_id))
        .first()
    )
    if session:
        db.delete(session)
        db.commit()

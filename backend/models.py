from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    owner = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    default_branch = Column(String(100), default="main")
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    __table_args__ = (
        UniqueConstraint("owner", "name", name="uq_repo_owner_name"),
    )

    pull_requests = relationship(
        "PullRequest", back_populates="repository", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Repository {self.owner}/{self.name}>"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(Integer, unique=True, nullable=True, index=True)
    login = Column(String(255), unique=True, nullable=False, index=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    authored_prs = relationship("PullRequest", back_populates="author")
    reviews = relationship("ReviewEvent", back_populates="reviewer")
    auth_sessions = relationship(
        "AuthSession", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User @{self.login}>"


class PullRequest(Base):
    __tablename__ = "pull_requests"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    pr_number = Column(Integer, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    state = Column(String(50), default="closed")
    body = Column(Text, nullable=True)
    body_length = Column(Integer, default=0)
    size_category = Column(String(50), default="Small")
    
    # Diff metrics (support for Phase 2 & code complexity metrics)
    additions = Column(Integer, default=0)
    deletions = Column(Integer, default=0)
    changed_files = Column(Integer, default=0)
    
    html_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    merged_at = Column(DateTime(timezone=True), nullable=True, index=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    first_review_at = Column(DateTime(timezone=True), nullable=True)
    time_to_first_review_hours = Column(Float, nullable=True)
    reviewer_login = Column(String(255), nullable=True)
    reviewer_workload = Column(Integer, default=0)
    review_count = Column(Integer, default=0)
    review_rounds = Column(Integer, default=0)
    reviews_synced_at = Column(DateTime(timezone=True), nullable=True)
    
    # Calculated analytics metrics
    review_time_hours = Column(Float, nullable=True)
    is_anomaly = Column(Boolean, default=False)
    anomaly_ratio = Column(Float, nullable=True)

    __table_args__ = (
        UniqueConstraint("repo_id", "pr_number", name="uq_repo_pr_number"),
        Index("idx_repo_merged_at", "repo_id", "merged_at"),
    )

    repository = relationship("Repository", back_populates="pull_requests")
    author = relationship("User", back_populates="authored_prs")
    reviews = relationship("ReviewEvent", back_populates="pull_request", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<PullRequest #{self.pr_number} in Repo ID {self.repo_id}>"


class ReviewEvent(Base):
    __tablename__ = "review_events"

    id = Column(Integer, primary_key=True, index=True)
    github_review_id = Column(Integer, nullable=True, index=True)
    pr_id = Column(Integer, ForeignKey("pull_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    state = Column(String(50), nullable=False)  # APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED
    body = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reviewer_workload = Column(Integer, default=0)

    pull_request = relationship("PullRequest", back_populates="reviews")
    reviewer = relationship("User", back_populates="reviews")

    def __repr__(self) -> str:
        return f"<ReviewEvent {self.state} for PR ID {self.pr_id}>"


class AuthSession(Base):
    """Server-side GitHub OAuth session with an encrypted access token."""

    __tablename__ = "auth_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_hash = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    encrypted_access_token = Column(Text, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="auth_sessions")

    def __repr__(self) -> str:
        return f"<AuthSession user_id={self.user_id} expires_at={self.expires_at}>"

"""Persistence helpers for audits and GitHub webhooks.

The analysis engine is stateless: it returns a JSON payload. This module mirrors
that payload into the relational tables so historical PRs and review events can
be queried after the request completes.
"""

from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Any, Dict, Iterable, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import SessionLocal
from models import PullRequest, Repository, ReviewEvent, User

_PERSIST_LOCK = Lock()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_datetime(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def upsert_user(
    db: Session,
    login: Optional[str],
    github_id: Optional[int] = None,
    avatar_url: Optional[str] = None,
) -> Optional[User]:
    login = (login or "").strip()
    if not login:
        return None

    user = None
    if github_id is not None:
        user = db.query(User).filter(User.github_id == github_id).first()
    if user is None:
        user = db.query(User).filter(User.login == login).first()
    if user is None:
        user = User(login=login, github_id=github_id, avatar_url=avatar_url)
        try:
            with db.begin_nested():
                db.add(user)
                db.flush()
        except IntegrityError:
            # Another worker/background task inserted the same login between our
            # SELECT and INSERT. The savepoint is rolled back, so re-read it.
            user = db.query(User).filter(User.login == login).first()
            if user is None:
                raise
    else:
        if github_id is not None:
            user.github_id = github_id
        if avatar_url:
            user.avatar_url = avatar_url
    db.flush()
    return user


def upsert_repository(db: Session, owner: str, repo: str) -> Repository:
    repository = (
        db.query(Repository)
        .filter(Repository.owner == owner, Repository.name == repo)
        .first()
    )
    if repository is None:
        repository = Repository(owner=owner, name=repo)
        try:
            with db.begin_nested():
                db.add(repository)
                db.flush()
        except IntegrityError:
            repository = (
                db.query(Repository)
                .filter(Repository.owner == owner, Repository.name == repo)
                .first()
            )
            if repository is None:
                raise
    repository.last_synced_at = utc_now()
    return repository


def _apply_record(db: Session, pull_request: PullRequest, record: Dict[str, Any]) -> None:
    author = record.get("author")
    if author:
        pull_request.author_id = upsert_user(db, author).id

    pull_request.title = str(record.get("title") or f"PR #{record.get('pr_number', '')}")
    pull_request.state = str(record.get("state") or "closed")
    pull_request.body_length = int(record.get("body_length") or 0)
    pull_request.size_category = str(record.get("size_category") or "Unknown")
    pull_request.additions = int(record.get("additions") or 0)
    pull_request.deletions = int(record.get("deletions") or 0)
    pull_request.changed_files = int(record.get("files_changed") or 0)
    pull_request.html_url = record.get("html_url")
    pull_request.created_at = parse_datetime(record.get("created_at")) or utc_now()
    pull_request.merged_at = parse_datetime(record.get("merged_at"))
    pull_request.closed_at = parse_datetime(record.get("closed_at"))

    first_review = record.get("first_review") or {}
    pull_request.first_review_at = parse_datetime(first_review.get("submitted_at"))
    pull_request.time_to_first_review_hours = record.get("first_review_latency_hours")
    pull_request.reviewer_login = first_review.get("reviewer")
    pull_request.reviewer_workload = int(record.get("reviewer_activity_7d") or 0)
    pull_request.reviewer_queue_at_creation = record.get("reviewer_queue_at_creation")
    pull_request.dynamic_threshold_ratio = record.get("dynamic_threshold_ratio")
    pull_request.dynamic_threshold_hours = record.get("dynamic_threshold_hours")
    pull_request.workload_ratio_to_median = record.get("workload_ratio_to_median")
    pull_request.is_workload_anomaly = bool(record.get("is_workload_anomaly"))
    pull_request.review_count = len(record.get("human_reviews") or [])
    pull_request.review_rounds = int(record.get("review_rounds") or 0)
    pull_request.review_time_hours = record.get("first_review_latency_hours")
    pull_request.anomaly_ratio = record.get("workload_ratio_to_median")
    pull_request.is_anomaly = bool(record.get("is_anomaly"))
    pull_request.reviews_synced_at = utc_now()


def _sync_reviews(
    db: Session,
    pull_request: PullRequest,
    reviews: Iterable[Dict[str, Any]],
) -> int:
    written = 0
    for review in reviews or []:
        reviewer_login = review.get("reviewer")
        if not reviewer_login or not review.get("submitted_at"):
            continue
        reviewer = upsert_user(db, reviewer_login)
        submitted_at = parse_datetime(review.get("submitted_at"))
        github_review_id = review.get("github_review_id")
        query = db.query(ReviewEvent).filter(ReviewEvent.pr_id == pull_request.id)
        if github_review_id is not None:
            existing = query.filter(ReviewEvent.github_review_id == github_review_id).first()
        else:
            existing = query.filter(
                ReviewEvent.reviewer_id == reviewer.id,
                ReviewEvent.state == str(review.get("state") or "commented").upper(),
                ReviewEvent.submitted_at == submitted_at,
            ).first()
        if existing is None:
            existing = ReviewEvent(
                pr_id=pull_request.id,
                reviewer_id=reviewer.id,
                github_review_id=github_review_id,
                state=str(review.get("state") or "commented").upper(),
                body=review.get("body"),
                submitted_at=submitted_at,
            )
            db.add(existing)
            written += 1
        else:
            existing.state = str(review.get("state") or existing.state).upper()
            existing.body = review.get("body", existing.body)
            existing.submitted_at = submitted_at
    return written


def upsert_pull_request(
    db: Session,
    repository: Repository,
    record: Dict[str, Any],
) -> tuple[PullRequest, int]:
    number = int(record.get("pr_number") or 0)
    title = str(record.get("title") or f"PR #{number}")
    created_at = parse_datetime(record.get("created_at")) or utc_now()
    pull_request = (
        db.query(PullRequest)
        .filter(
            PullRequest.repo_id == repository.id,
            PullRequest.pr_number == number,
        )
        .first()
    )
    if pull_request is None:
        pull_request = PullRequest(
            repo_id=repository.id,
            pr_number=number,
            title=title,
            created_at=created_at,
        )
        try:
            with db.begin_nested():
                db.add(pull_request)
                db.flush()
        except IntegrityError:
            pull_request = (
                db.query(PullRequest)
                .filter(
                    PullRequest.repo_id == repository.id,
                    PullRequest.pr_number == number,
                )
                .first()
            )
            if pull_request is None:
                raise

    _apply_record(db, pull_request, record)
    db.flush()
    written = _sync_reviews(db, pull_request, record.get("human_reviews") or [])
    return pull_request, written


def persist_audit_result(result: Dict[str, Any], db: Optional[Session] = None) -> Dict[str, int]:
    """Mirror a completed audit payload into the database.

    A process-wide lock serialises audit and webhook writes so two background
    tasks cannot race on the same user/repository/PR insert. Cross-process races
    are still handled by unique-constraint retries in the upserts.
    """
    with _PERSIST_LOCK:
        return _persist_audit_result(result, db)


def _persist_audit_result(result: Dict[str, Any], db: Optional[Session] = None) -> Dict[str, int]:
    owner = str(result.get("owner") or "").strip()
    repo = str(result.get("repo") or "").strip()
    records = result.get("pull_requests") or []
    if not owner or not repo or not isinstance(records, list) or not records:
        return {"repositories": 0, "pull_requests": 0, "reviews": 0}

    owns_session = db is None
    session = db or SessionLocal()
    try:
        repository = upsert_repository(session, owner, repo)
        review_count = 0
        for record in records:
            if not record.get("pr_number"):
                continue
            _pull_request, written = upsert_pull_request(session, repository, record)
            review_count += written
        repository.last_synced_at = utc_now()
        session.commit()
        return {
            "repositories": 1,
            "pull_requests": len(records),
            "reviews": review_count,
        }
    except Exception:
        session.rollback()
        raise
    finally:
        if owns_session:
            session.close()


def persist_pull_request_record(owner: str, repo: str, record: Dict[str, Any]) -> Dict[str, int]:
    return persist_audit_result(
        {"owner": owner, "repo": repo, "pull_requests": [record]}
    )

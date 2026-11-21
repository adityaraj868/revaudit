"""GitHub webhook verification and background ingestion."""

from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from github_client import GitHubAPIError, GitHubClient
from persistence import persist_pull_request_record
from statistical_engine import (
    build_pull_request_record,
    hours_between,
    is_bot,
    parse_timestamp,
)

REVIEW_STATES = {"approved", "changes_requested", "commented"}
HANDLED_ACTIONS = {"closed"}


class WebhookConfigurationError(RuntimeError):
    """Raised when the deployment has not configured a webhook secret."""


def webhook_secret() -> str:
    return os.getenv("GITHUB_WEBHOOK_SECRET", "").strip()


def verify_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
    """Validate GitHub's X-Hub-Signature-256 HMAC in constant time."""
    secret = webhook_secret()
    if not secret:
        raise WebhookConfigurationError(
            "GITHUB_WEBHOOK_SECRET is not configured; refusing to accept webhooks."
        )
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    provided = signature_header.split("=", 1)[1].strip()
    return hmac.compare_digest(expected, provided)


def should_process(event_type: Optional[str], action: Optional[str]) -> bool:
    return event_type == "pull_request" and (action or "") in HANDLED_ACTIONS


def _review_key(login: str, submitted: Any) -> tuple[str, str]:
    parsed = parse_timestamp(submitted)
    return (
        (login or "").lower(),
        parsed.isoformat() if parsed else str(submitted),
    )


def _merge_review_events(record: Dict[str, Any], reviews: List[Dict[str, Any]]) -> None:
    """Merge REST review events into the timeline-derived record.

    Timeline events do not carry GitHub review IDs, so the reviews endpoint is
    used to enrich matching events and to recover reviews when the timeline is
    unavailable.
    """
    author = str(record.get("author") or "").lower()
    merged: List[Dict[str, Any]] = list(record.get("human_reviews") or [])
    index = {
        _review_key(str(item.get("reviewer") or ""), item.get("submitted_at")): item
        for item in merged
    }

    for review in reviews:
        login = (review.get("user") or {}).get("login")
        submitted = review.get("submitted_at") or review.get("created_at")
        state = str(review.get("state") or "commented").lower()
        if (
            not login
            or not submitted
            or login.lower() == author
            or is_bot(login)
            or state not in REVIEW_STATES
        ):
            continue
        key = _review_key(login, submitted)
        entry = index.get(key)
        if entry is None:
            entry = {
                "reviewer": login,
                "state": state,
                "submitted_at": submitted,
            }
            merged.append(entry)
            index[key] = entry
        entry["github_review_id"] = review.get("id")
        entry["body"] = review.get("body")

    merged.sort(key=lambda item: item.get("submitted_at") or "")
    record["human_reviews"] = merged
    record["review_rounds"] = len(merged)
    if not merged:
        return

    record["first_review"] = merged[0]
    record["first_review_observed"] = True
    eligible = record.get("ready_for_review_at") or record.get("created_at")
    latency = hours_between(
        parse_timestamp(eligible), parse_timestamp(merged[0].get("submitted_at"))
    )
    if latency is not None:
        record["first_review_latency_hours"] = latency
        record["review_time_observed"] = latency
        record["duration_hours"] = latency
    record["event_observed"] = True
    record["censoring_status"] = "first_review"


def process_pull_request_event(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch and persist a closed pull request after GitHub delivers a webhook.

    Runs from FastAPI's BackgroundTasks, so the HTTP response to GitHub is sent
    before any GitHub REST or database work begins.
    """
    repository = payload.get("repository") or {}
    owner = (repository.get("owner") or {}).get("login")
    repo_name = repository.get("name")
    pull_request = payload.get("pull_request") or {}
    number = pull_request.get("number")
    if not owner or not repo_name or not number:
        return {"status": "ignored", "reason": "incomplete pull_request payload"}

    client = GitHubClient()
    try:
        detail = client.get_pull_request(owner, repo_name, int(number))
        timeline = client.list_timeline(owner, repo_name, int(number))
        reviews = client.list_reviews(owner, repo_name, int(number))
    except GitHubAPIError as exc:
        return {
            "status": "error",
            "owner": owner,
            "repo": repo_name,
            "pr_number": number,
            "detail": str(exc),
        }

    record = build_pull_request_record(
        detail, detail, timeline, datetime.now(timezone.utc)
    )
    _merge_review_events(record, reviews)
    counts = persist_pull_request_record(owner, repo_name, record)
    return {
        "status": "persisted",
        "owner": owner,
        "repo": repo_name,
        "pr_number": number,
        **counts,
    }

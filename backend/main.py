from __future__ import annotations

import os
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import requests
from fastapi import Body, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request

from analytics import analyze_pull_requests, categorize_pr_size, parse_utc_dt
from auth import (
    AuthContext,
    create_auth_session,
    resolve_auth_session,
    revoke_auth_session,
)
from database import Base, ensure_schema, engine, get_db
from github_client import GitHubAPIError, GitHubClient
from models import PullRequest, Repository, ReviewEvent, User
from reporting import build_audit_pdf


# Initialize both fresh databases and existing prototype databases.
Base.metadata.create_all(bind=engine)
ensure_schema()

app = FastAPI(
    title="RevAudit Engine",
    description=(
        "Analyzes GitHub PR review effort with paginated ingestion, reviewer "
        "workload snapshots, and size-controlled anomaly detection."
    ),
    version="2.1.0",
)

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
allowed_origins = {
    frontend_url,
    "http://localhost:5173",
    "http://localhost:3000",
}
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "dev-only-change-me"),
    session_cookie="revaudit_session",
    max_age=60 * 60 * 24 * 30,
    same_site="lax",
    https_only=os.getenv("COOKIE_SECURE", "false").lower() == "true",
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_or_create_user(db: Session, user_dict: Optional[Dict[str, Any]]) -> Optional[User]:
    """Find a GitHub user by stable ID, then update its public profile fields."""
    if not user_dict or not isinstance(user_dict, dict) or not user_dict.get("login"):
        return None

    github_id = user_dict.get("id")
    user = None
    if github_id is not None:
        user = db.query(User).filter(User.github_id == github_id).first()
    if user is None:
        user = db.query(User).filter(User.login == user_dict["login"]).first()
    if user is None:
        user = User(login=user_dict["login"], github_id=github_id)
        db.add(user)

    user.login = user_dict["login"]
    user.github_id = github_id or user.github_id
    user.avatar_url = user_dict.get("avatar_url") or user.avatar_url
    db.flush()
    return user


def get_optional_auth(
    request: Request, db: Session = Depends(get_db)
) -> Optional[AuthContext]:
    auth_context = resolve_auth_session(db, request.session.get("auth_session_id"))
    if auth_context is None:
        request.session.pop("auth_session_id", None)
    return auth_context


def github_oauth_config() -> Dict[str, str]:
    client_id = os.getenv("GITHUB_CLIENT_ID", "").strip()
    client_secret = os.getenv("GITHUB_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=503,
            detail="GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.",
        )
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": os.getenv(
            "GITHUB_REDIRECT_URI", "http://localhost:8000/auth/github/callback"
        ),
    }


def redirect_to_frontend(**params: str) -> RedirectResponse:
    query = urlencode(params)
    target = f"{frontend_url}/?{query}" if query else f"{frontend_url}/"
    return RedirectResponse(target, status_code=302)


@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "service": "RevAudit API",
        "status": "active",
        "database": "Neon-compatible PostgreSQL/SQLite",
        "docs": "/docs",
        "audit_endpoint": "/api/audit?owner={owner}&repo={repo}",
        "features": {
            "github_oauth": "/auth/github/login",
            "pagination": True,
            "reviewer_workload": True,
            "pdf_export": "/api/reports/pdf",
        },
    }


@app.get("/auth/github/login")
def github_login(request: Request) -> RedirectResponse:
    config = github_oauth_config()
    state = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state
    oauth_query = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "state": state,
    }
    # OAuth Apps use scopes; GitHub Apps use the fine-grained permissions
    # selected in their registration and should leave this value blank.
    oauth_scope = os.getenv("GITHUB_OAUTH_SCOPE", "read:user user:email repo").strip()
    if oauth_scope:
        oauth_query["scope"] = oauth_scope
    query = urlencode(oauth_query)
    return RedirectResponse(
        f"https://github.com/login/oauth/authorize?{query}", status_code=302
    )


@app.get("/auth/github/callback")
def github_callback(
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if error:
        return redirect_to_frontend(auth_error=error)

    expected_state = request.session.pop("oauth_state", None)
    if not code or not state or not expected_state or state != expected_state:
        return redirect_to_frontend(auth_error="OAuth state validation failed")

    config = github_oauth_config()
    try:
        token_response = requests.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "code": code,
                "redirect_uri": config["redirect_uri"],
            },
            headers={"Accept": "application/json"},
            timeout=20,
        )
        if token_response.status_code != 200:
            return redirect_to_frontend(auth_error="GitHub token exchange failed")
        token_payload = token_response.json()
        access_token = token_payload.get("access_token")
        if not access_token:
            return redirect_to_frontend(auth_error="GitHub did not return an access token")

        profile_response = requests.get(
            "https://api.github.com/user",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {access_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=20,
        )
        if profile_response.status_code != 200:
            return redirect_to_frontend(auth_error="GitHub profile lookup failed")
        profile = profile_response.json()
    except (requests.RequestException, ValueError):
        return redirect_to_frontend(auth_error="GitHub OAuth network error")

    user = get_or_create_user(db, profile)
    if user is None:
        return redirect_to_frontend(auth_error="GitHub profile did not include a login")

    try:
        session_id = create_auth_session(db, user, access_token)
    except RuntimeError as exc:
        return redirect_to_frontend(auth_error=str(exc))
    request.session.clear()
    request.session["auth_session_id"] = session_id
    return redirect_to_frontend(auth="success")


@app.get("/api/auth/me")
def auth_me(auth_context: Optional[AuthContext] = Depends(get_optional_auth)) -> Dict[str, Any]:
    if auth_context is None:
        return {"authenticated": False, "user": None}
    return {
        "authenticated": True,
        "user": {
            "id": auth_context.user.id,
            "github_id": auth_context.user.github_id,
            "login": auth_context.user.login,
            "avatar_url": auth_context.user.avatar_url,
        },
    }


@app.post("/api/auth/logout")
def auth_logout(
    request: Request,
    db: Session = Depends(get_db),
) -> Dict[str, bool]:
    revoke_auth_session(db, request.session.get("auth_session_id"))
    request.session.clear()
    return {"ok": True}


def sync_reviews(
    db: Session,
    client: GitHubClient,
    owner: str,
    repo: str,
    review_targets: list[PullRequest],
) -> Dict[str, Any]:
    """Fetch and idempotently upsert review events for merged PRs."""
    max_prs = int(os.getenv("GITHUB_REVIEW_MAX_PRS", "250"))
    synced_prs = 0
    synced_events = 0
    error = None

    for pull_request in review_targets[:max_prs]:
        try:
            reviews = client.list_reviews(owner, repo, pull_request.pr_number)
        except GitHubAPIError as exc:
            error = exc.message
            break

        for review in reviews:
            reviewer = get_or_create_user(db, review.get("user"))
            github_review_id = review.get("id")
            existing = None
            if github_review_id is not None:
                existing = (
                    db.query(ReviewEvent)
                    .filter(
                        ReviewEvent.pr_id == pull_request.id,
                        ReviewEvent.github_review_id == github_review_id,
                    )
                    .first()
                )
            submitted_at = parse_utc_dt(review.get("submitted_at"))
            if existing is None and github_review_id is None:
                existing = (
                    db.query(ReviewEvent)
                    .filter(
                        ReviewEvent.pr_id == pull_request.id,
                        ReviewEvent.reviewer_id == (reviewer.id if reviewer else None),
                        ReviewEvent.submitted_at == submitted_at,
                    )
                    .first()
                )
            if existing is None:
                existing = ReviewEvent(
                    github_review_id=github_review_id,
                    pr_id=pull_request.id,
                    reviewer_id=reviewer.id if reviewer else None,
                    state=review.get("state", "COMMENTED"),
                    body=review.get("body") or "",
                    submitted_at=submitted_at,
                )
                db.add(existing)
                synced_events += 1
            else:
                existing.reviewer_id = reviewer.id if reviewer else existing.reviewer_id
                existing.state = review.get("state", existing.state)
                existing.body = review.get("body") or existing.body
                existing.submitted_at = submitted_at or existing.submitted_at
        pull_request.reviews_synced_at = utc_now()
        synced_prs += 1
        db.flush()

    db.commit()
    return {
        "prs_synced": synced_prs,
        "events_upserted": synced_events,
        "error": error,
        "limit": max_prs,
    }


@app.get("/api/audit")
def audit_repository(
    owner: str = Query(..., description="GitHub repository owner/organization"),
    repo: str = Query(..., description="GitHub repository name"),
    db: Session = Depends(get_db),
    auth_context: Optional[AuthContext] = Depends(get_optional_auth),
) -> Dict[str, Any]:
    """Paginate PRs, sync review events, calculate workload, and analyze a repo."""
    clean_owner = owner.strip()
    clean_repo = repo.strip()
    if not clean_owner or not clean_repo:
        raise HTTPException(status_code=422, detail="owner and repo are required")

    repo_obj = (
        db.query(Repository)
        .filter(
            func.lower(Repository.owner) == clean_owner.lower(),
            func.lower(Repository.name) == clean_repo.lower(),
        )
        .first()
    )
    if repo_obj is None:
        repo_obj = Repository(owner=clean_owner, name=clean_repo)
        db.add(repo_obj)
        db.commit()
        db.refresh(repo_obj)

    client = GitHubClient(token=auth_context.access_token if auth_context else None)
    had_last_sync = repo_obj.last_synced_at is not None
    raw_prs = []
    sync_error = None
    try:
        raw_prs = client.list_closed_pull_requests(
            clean_owner,
            clean_repo,
            stop_before=repo_obj.last_synced_at.isoformat()
            if repo_obj.last_synced_at
            else None,
        )
    except GitHubAPIError as exc:
        sync_error = exc.message
        if exc.status_code == 404:
            raise HTTPException(status_code=404, detail=exc.message) from exc

    changed_prs: list[PullRequest] = []
    new_prs_fetched = 0
    for pr_data in raw_prs:
        pr_number = pr_data.get("number")
        if not pr_number:
            continue
        created_at = parse_utc_dt(pr_data.get("created_at")) or utc_now()
        merged_at = parse_utc_dt(pr_data.get("merged_at"))
        closed_at = parse_utc_dt(pr_data.get("closed_at"))
        body_text = pr_data.get("body") or ""
        author = get_or_create_user(db, pr_data.get("user"))
        pull_request = (
            db.query(PullRequest)
            .filter(
                PullRequest.repo_id == repo_obj.id,
                PullRequest.pr_number == pr_number,
            )
            .first()
        )
        if pull_request is None:
            pull_request = PullRequest(
                repo_id=repo_obj.id,
                pr_number=pr_number,
                title=pr_data.get("title", f"PR #{pr_number}"),
                created_at=created_at,
            )
            db.add(pull_request)
            new_prs_fetched += 1

        pull_request.title = pr_data.get("title", pull_request.title)
        pull_request.author_id = author.id if author else pull_request.author_id
        pull_request.state = pr_data.get("state", pull_request.state or "closed")
        pull_request.body = body_text
        pull_request.body_length = len(body_text)
        pull_request.size_category = categorize_pr_size(len(body_text))
        pull_request.additions = int(pr_data.get("additions") or 0)
        pull_request.deletions = int(pr_data.get("deletions") or 0)
        pull_request.changed_files = int(pr_data.get("changed_files") or 0)
        pull_request.html_url = pr_data.get("html_url")
        pull_request.created_at = created_at
        pull_request.closed_at = closed_at
        pull_request.merged_at = merged_at
        if merged_at and created_at:
            pull_request.review_time_hours = round(
                max(0.0, (merged_at - created_at).total_seconds() / 3600.0), 2
            )
        else:
            pull_request.review_time_hours = None
        if pull_request.merged_at is not None:
            # The PR appeared in the delta, so its review list may have changed.
            pull_request.reviews_synced_at = None
        changed_prs.append(pull_request)

    db.flush()
    all_repo_prs = (
        db.query(PullRequest)
        .filter(PullRequest.repo_id == repo_obj.id)
        .all()
    )

    review_targets: list[PullRequest] = []
    seen_ids = set()
    for pull_request in [*changed_prs, *all_repo_prs]:
        if (
            pull_request.id not in seen_ids
            and pull_request.merged_at is not None
            and pull_request.reviews_synced_at is None
        ):
            review_targets.append(pull_request)
            seen_ids.add(pull_request.id)

    review_sync = (
        sync_reviews(db, client, clean_owner, clean_repo, review_targets)
        if not sync_error
        else {"prs_synced": 0, "events_upserted": 0, "error": None, "limit": 0}
    )

    if not sync_error:
        repo_obj.last_synced_at = utc_now()
        db.commit()
    all_repo_prs = (
        db.query(PullRequest)
        .filter(PullRequest.repo_id == repo_obj.id)
        .all()
    )

    if not all_repo_prs and sync_error:
        raise HTTPException(status_code=502, detail=sync_error)

    analysis = analyze_pull_requests(all_repo_prs, db)
    return {
        "owner": repo_obj.owner,
        "repo": repo_obj.name,
        "total_closed_prs": len(all_repo_prs),
        "merged_prs_count": len(analysis["merged_prs"]),
        "unmerged_prs_dropped": len(all_repo_prs) - len(analysis["merged_prs"]),
        "baseline_medians": analysis["baseline_medians"],
        "anomalies_count": len(analysis["anomalies"]),
        "anomalies": analysis["anomalies"],
        "pull_requests": analysis["merged_prs"],
        "workload_summary": analysis["workload_summary"],
        "data_source": "neon_database" if sync_error else "github_paginated_sync",
        "new_prs_fetched": new_prs_fetched,
        "last_synced_at": repo_obj.last_synced_at.isoformat()
        if repo_obj.last_synced_at
        else None,
        "pagination": {
            "enabled": True,
            "max_pages": client.max_pages,
            "stop_at_last_sync": had_last_sync,
        },
        "review_sync": review_sync,
        "sync_error": sync_error,
    }


@app.post("/api/reports/pdf")
def export_audit_pdf(payload: Dict[str, Any] = Body(...)) -> Response:
    owner = str(payload.get("owner", "repository")).strip() or "repository"
    repo = str(payload.get("repo", "audit")).strip() or "audit"
    try:
        pdf_bytes = build_audit_pdf(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    safe_filename = "".join(
        character if character.isalnum() or character in "-_" else "_"
        for character in f"RevAudit_{owner}_{repo}"
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}.pdf"'
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

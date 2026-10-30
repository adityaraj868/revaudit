from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from threading import Lock
from time import time
from typing import Any, Dict, List, Optional, Tuple
import os
import re

import requests
from fastapi import Body, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request

from auth import (
    AuthContext,
    create_auth_session,
    resolve_auth_session,
    revoke_auth_session,
)
from database import Base, ensure_schema, engine, get_db
from models import User
from reporting import build_audit_pdf
from statistical_engine import build_pull_request_record, finalize_analysis

API_VERSION = "2022-11-28"
REQUEST_TIMEOUT_SECONDS = 20
MAX_UNAUTHENTICATED_SAMPLE = 25
CACHE_TTL_SECONDS = 300
MAX_CACHED_AUDITS = 64

app = FastAPI(
    title="RevAudit Engine",
    description="Censoring-aware analysis of GitHub PR review queue latency and process patterns.",
    version="2.0.0",
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

# Initialize new deployments and apply additive changes to existing databases.
Base.metadata.create_all(bind=engine)
ensure_schema()

_audit_cache: Dict[Tuple[str, str, int, bool], Tuple[float, Dict[str, Any]]] = {}
_cache_lock = Lock()


class GitHubAPIError(Exception):
    def __init__(self, status_code: int, detail: str, retry_after: Optional[str] = None):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.retry_after = retry_after


class GitHubClient:
    def __init__(self, token: Optional[str]):
        self.authenticated = bool(token)
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": API_VERSION,
            "User-Agent": "RevAudit-Statistical-Engine",
        }
        if token:
            self.headers["Authorization"] = f"Bearer {token}"
        self.rate_limit = {"remaining": None, "limit": None, "reset_at": None}

    def get_json(self, url: str, params: Optional[Dict[str, Any]] = None) -> Tuple[Any, requests.Response]:
        try:
            response = requests.get(url, params=params, headers=self.headers, timeout=REQUEST_TIMEOUT_SECONDS)
        except requests.RequestException as exc:
            raise GitHubAPIError(502, f"Network error connecting to GitHub: {exc}")

        self.rate_limit = {
            "remaining": response.headers.get("X-RateLimit-Remaining"),
            "limit": response.headers.get("X-RateLimit-Limit"),
            "reset_at": response.headers.get("X-RateLimit-Reset"),
        }
        if response.status_code == 404:
            raise GitHubAPIError(404, "Repository or requested pull request data was not found.")
        if response.status_code in (403, 429):
            remaining = response.headers.get("X-RateLimit-Remaining")
            reset = response.headers.get("X-RateLimit-Reset")
            if response.status_code == 429 or remaining == "0" or response.headers.get("Retry-After"):
                detail = "GitHub API rate limit reached. Configure GITHUB_TOKEN to analyze a larger sample."
                if reset:
                    detail += f" Rate limit reset timestamp: {reset}."
                raise GitHubAPIError(429, detail, response.headers.get("Retry-After"))
            raise GitHubAPIError(403, "GitHub denied access to this repository or API resource.")
        if response.status_code >= 400:
            raise GitHubAPIError(response.status_code, f"GitHub API returned HTTP {response.status_code}.")
        try:
            return response.json(), response
        except ValueError:
            raise GitHubAPIError(502, "GitHub returned an invalid JSON response.")

    def get_all_pages(self, url: str, params: Optional[Dict[str, Any]] = None, limit: Optional[int] = None) -> Tuple[List[Dict[str, Any]], int]:
        output: List[Dict[str, Any]] = []
        pages = 0
        next_url: Optional[str] = url
        next_params = params
        while next_url and (limit is None or len(output) < limit):
            rows, response = self.get_json(next_url, next_params)
            pages += 1
            if not isinstance(rows, list):
                raise GitHubAPIError(502, "GitHub returned an unexpected response format.")
            remaining = None if limit is None else max(0, limit - len(output))
            output.extend(rows[:remaining] if remaining is not None else rows)
            next_url = _next_link(response.headers.get("Link", ""))
            next_params = None
        return output, pages


def _next_link(link_header: str) -> Optional[str]:
    for part in link_header.split(","):
        if 'rel="next"' in part:
            match = re.search(r"<([^>]+)>", part)
            return match.group(1) if match else None
    return None


def _fetch_pr_enrichment(client: GitHubClient, owner: str, repo: str, raw: Dict[str, Any]) -> Tuple[int, Optional[Dict[str, Any]], Optional[List[Dict[str, Any]]], List[str]]:
    number = int(raw["number"])
    base_url = f"https://api.github.com/repos/{owner}/{repo}"
    warnings: List[str] = []
    detail: Optional[Dict[str, Any]] = None
    timeline: Optional[List[Dict[str, Any]]] = None
    try:
        detail, _ = client.get_json(f"{base_url}/pulls/{number}")
    except GitHubAPIError as exc:
        if exc.status_code == 429:
            raise
        warnings.append(f"PR #{number}: change-size details unavailable.")
    try:
        timeline, _ = client.get_all_pages(
            f"{base_url}/issues/{number}/timeline",
            params={"per_page": 100},
        )
    except GitHubAPIError as exc:
        if exc.status_code == 429:
            raise
        warnings.append(f"PR #{number}: review timeline unavailable.")
    return number, detail, timeline, warnings


def _fetch_enrichments_batched(client: GitHubClient, owner: str, repo: str, prs: List[Dict[str, Any]]) -> Tuple[Dict[int, Tuple[Optional[Dict[str, Any]], Optional[List[Dict[str, Any]]]]], List[str], Optional[str]]:
    enriched: Dict[int, Tuple[Optional[Dict[str, Any]], Optional[List[Dict[str, Any]]]]] = {}
    warnings: List[str] = []
    rate_limit_message: Optional[str] = None
    batch_size = 6
    for start in range(0, len(prs), batch_size):
        batch = prs[start:start + batch_size]
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(_fetch_pr_enrichment, client, owner, repo, pr) for pr in batch]
            for future in as_completed(futures):
                try:
                    number, detail, timeline, item_warnings = future.result()
                    enriched[number] = (detail, timeline)
                    warnings.extend(item_warnings)
                except GitHubAPIError as exc:
                    if exc.status_code == 429:
                        rate_limit_message = exc.detail
                    else:
                        warnings.append(str(exc))
        if rate_limit_message:
            warnings.append(rate_limit_message)
            break
    return enriched, warnings, rate_limit_message


def _cached(key: Tuple[str, str, int, bool]) -> Optional[Dict[str, Any]]:
    with _cache_lock:
        entry = _audit_cache.get(key)
        if entry and time() - entry[0] < CACHE_TTL_SECONDS:
            return entry[1]
        if entry:
            _audit_cache.pop(key, None)
    return None


def _put_cache(key: Tuple[str, str, int, bool], value: Dict[str, Any]) -> None:
    with _cache_lock:
        if len(_audit_cache) >= MAX_CACHED_AUDITS:
            oldest = min(_audit_cache, key=lambda item: _audit_cache[item][0])
            _audit_cache.pop(oldest, None)
        _audit_cache[key] = (time(), value)


def get_or_create_user(
    db: Session, user_dict: Optional[Dict[str, Any]]
) -> Optional[User]:
    """Persist the public GitHub profile used by a server-side auth session."""
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
    context = resolve_auth_session(db, request.session.get("auth_session_id"))
    if context is None:
        request.session.pop("auth_session_id", None)
    return context


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
    from urllib.parse import urlencode

    query = urlencode(params)
    target = f"{frontend_url}/?{query}" if query else f"{frontend_url}/"
    return RedirectResponse(target, status_code=302)


def _audit(owner: str, repo: str, requested_limit: int, client: GitHubClient) -> Dict[str, Any]:
    effective_limit = requested_limit if client.authenticated else min(requested_limit, MAX_UNAUTHENTICATED_SAMPLE)
    base_url = f"https://api.github.com/repos/{owner}/{repo}/pulls"
    raw_prs, pages = client.get_all_pages(
        base_url,
        params={"state": "all", "sort": "created", "direction": "desc", "per_page": 100},
        limit=effective_limit,
    )
    enriched, enrichment_warnings, partial_reason = _fetch_enrichments_batched(client, owner, repo, raw_prs)
    as_of = datetime.now(timezone.utc)
    records = []
    for raw in raw_prs:
        detail, timeline = enriched.get(int(raw["number"]), (None, None))
        records.append(build_pull_request_record(raw, detail, timeline, as_of))
    created_dates = [record["created_at"] for record in records if record.get("created_at")]
    metadata = {
        "analysis_version": "2.0.0",
        "sample_limit_requested": requested_limit,
        "sample_limit_applied": effective_limit,
        "sample_truncated": len(raw_prs) >= effective_limit,
        "pagination_pages": pages,
        "sample_window_start": min(created_dates) if created_dates else None,
        "sample_window_end": max(created_dates) if created_dates else None,
        "as_of": as_of.isoformat(),
        "github_authenticated": client.authenticated,
        "github_rate_limit": client.rate_limit,
        "partial": bool(partial_reason),
        "partial_reason": partial_reason,
        "sample_limit_note": (
            f"Unauthenticated GitHub API access is capped at {MAX_UNAUTHENTICATED_SAMPLE} PRs per audit to reduce rate-limit exhaustion."
            if not client.authenticated and requested_limit > MAX_UNAUTHENTICATED_SAMPLE else None
        ),
    }
    result = finalize_analysis(records, owner, repo, metadata)
    result["total_closed_prs"] = result["merged_prs_count"] + result["unmerged_closed_prs_count"]
    result["unmerged_prs_dropped"] = 0
    result["data_quality"]["warnings"].extend(enrichment_warnings)
    if metadata["sample_limit_note"]:
        result["data_quality"]["warnings"].append(metadata["sample_limit_note"])
    return result


@app.get("/")
def root():
    return {
        "service": "RevAudit API",
        "status": "active",
        "docs": "/docs",
        "audit_endpoint": "/api/audit?owner={owner}&repo={repo}&limit=50",
        "primary_metric": "time to first human review with right-censoring",
        "features": {
            "github_oauth": "/auth/github/login",
            "pagination": True,
            "reviewer_workload": True,
            "pdf_export": "/api/reports/pdf",
        },
    }


@app.get("/auth/github/login")
def github_login(request: Request) -> RedirectResponse:
    from secrets import token_urlsafe
    from urllib.parse import urlencode

    config = github_oauth_config()
    state = token_urlsafe(32)
    request.session["oauth_state"] = state
    oauth_query = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "state": state,
    }
    # OAuth Apps use scopes; GitHub Apps use their registered fine-grained
    # permissions and should leave GITHUB_OAUTH_SCOPE blank.
    oauth_scope = os.getenv("GITHUB_OAUTH_SCOPE", "read:user user:email repo").strip()
    if oauth_scope:
        oauth_query["scope"] = oauth_scope
    return RedirectResponse(
        "https://github.com/login/oauth/authorize?" + urlencode(oauth_query),
        status_code=302,
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
            timeout=REQUEST_TIMEOUT_SECONDS,
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
                "X-GitHub-Api-Version": API_VERSION,
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
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
def auth_me(
    auth_context: Optional[AuthContext] = Depends(get_optional_auth),
) -> Dict[str, Any]:
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
def auth_logout(request: Request, db: Session = Depends(get_db)) -> Dict[str, bool]:
    revoke_auth_session(db, request.session.get("auth_session_id"))
    request.session.clear()
    return {"ok": True}


@app.get("/api/audit")
def audit_repository(
    owner: str = Query(..., min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_.-]+$"),
    repo: str = Query(..., min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_.-]+$"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of recent PRs to include."),
    refresh: bool = Query(False, description="Skip the five-minute in-memory cache."),
    auth_context: Optional[AuthContext] = Depends(get_optional_auth),
):
    token = auth_context.access_token if auth_context else os.getenv("GITHUB_TOKEN")
    can_cache = auth_context is None
    cache_key = (owner.lower(), repo.lower(), limit, bool(token))
    if can_cache and not refresh:
        cached = _cached(cache_key)
        if cached:
            return cached
    client = GitHubClient(token)
    try:
        result = _audit(owner, repo, limit, client)
    except GitHubAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)
    if can_cache and not result["metadata"]["partial"]:
        _put_cache(cache_key, result)
    return result


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

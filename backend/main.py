from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from threading import Lock
from time import time
from typing import Any, Dict, List, Optional, Tuple
import os
import re

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    }


@app.get("/api/audit")
def audit_repository(
    owner: str = Query(..., min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_.-]+$"),
    repo: str = Query(..., min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_.-]+$"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of recent PRs to include."),
    refresh: bool = Query(False, description="Skip the five-minute in-memory cache."),
):
    token = os.getenv("GITHUB_TOKEN")
    cache_key = (owner.lower(), repo.lower(), limit, bool(token))
    if not refresh:
        cached = _cached(cache_key)
        if cached:
            return cached
    client = GitHubClient(token)
    try:
        result = _audit(owner, repo, limit, client)
    except GitHubAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)
    if not result["metadata"]["partial"]:
        _put_cache(cache_key, result)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

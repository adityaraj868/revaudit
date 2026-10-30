"""Small GitHub REST client used by the audit ingestion pipeline."""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

import requests


class GitHubAPIError(RuntimeError):
    """An actionable error returned by GitHub or the network layer."""

    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class GitHubClient:
    """Authenticated GitHub client with Link-header pagination.

    Pagination is deliberately bounded by ``GITHUB_MAX_PAGES`` so an audit
    request cannot accidentally scan an unbounded repository history.
    """

    def __init__(
        self,
        token: Optional[str] = None,
        timeout: int = 20,
        max_pages: Optional[int] = None,
    ):
        self.timeout = timeout
        self.max_pages = max_pages or int(os.getenv("GITHUB_MAX_PAGES", "25"))
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Accept": "application/vnd.github+json",
                "User-Agent": "RevAudit-Engine/2.1",
                "X-GitHub-Api-Version": "2022-11-28",
            }
        )
        selected_token = token or os.getenv("GITHUB_TOKEN", "").strip()
        if selected_token:
            self.session.headers["Authorization"] = f"Bearer {selected_token}"

    def _get(self, url: str, params: Optional[Dict[str, Any]] = None) -> requests.Response:
        try:
            response = self.session.get(url, params=params, timeout=self.timeout)
        except requests.RequestException as exc:
            raise GitHubAPIError(f"Network error connecting to GitHub: {exc}") from exc

        if response.status_code == 404:
            raise GitHubAPIError("GitHub repository or resource was not found.", 404)
        if response.status_code == 401:
            raise GitHubAPIError("GitHub OAuth token is invalid or expired.", 401)
        if response.status_code == 403:
            remaining = response.headers.get("X-RateLimit-Remaining")
            detail = "GitHub API rate limit exceeded."
            if remaining is not None:
                detail += f" Remaining requests: {remaining}."
            raise GitHubAPIError(detail, 429)
        if response.status_code != 200:
            try:
                payload = response.json()
                detail = payload.get("message", response.text)
            except ValueError:
                detail = response.text
            raise GitHubAPIError(f"GitHub API error: {detail}", response.status_code)
        return response

    def paginate(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        stop_before: Optional[Any] = None,
    ) -> Iterable[Dict[str, Any]]:
        """Yield all items across GitHub pages, stopping at a known sync point."""
        next_url: Optional[str] = url
        next_params = dict(params or {})
        next_params.setdefault("per_page", 100)
        pages_read = 0
        stop_before_dt = None
        if isinstance(stop_before, str):
            try:
                stop_before_dt = datetime.fromisoformat(stop_before.replace("Z", "+00:00"))
            except ValueError:
                stop_before_dt = None

        while next_url and pages_read < self.max_pages:
            response = self._get(next_url, next_params)
            pages_read += 1
            payload = response.json()
            if not isinstance(payload, list):
                raise GitHubAPIError("GitHub returned an unexpected non-list payload.")

            reached_sync_point = False
            for item in payload:
                if stop_before is not None:
                    updated_at = item.get("updated_at")
                    try:
                        updated_at_dt = (
                            datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                            if updated_at
                            else None
                        )
                    except ValueError:
                        updated_at_dt = None
                    if (
                        updated_at_dt is not None
                        and stop_before_dt is not None
                        and updated_at_dt <= stop_before_dt
                    ):
                        reached_sync_point = True
                        break
                yield item

            if reached_sync_point:
                break
            next_url = response.links.get("next", {}).get("url")
            next_params = {}

    def list_closed_pull_requests(
        self, owner: str, repo: str, stop_before: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return list(
            self.paginate(
                f"https://api.github.com/repos/{owner}/{repo}/pulls",
                {
                    "state": "closed",
                    "sort": "updated",
                    "direction": "desc",
                },
                stop_before=stop_before,
            )
        )

    def list_reviews(self, owner: str, repo: str, pr_number: int) -> List[Dict[str, Any]]:
        return list(
            self.paginate(
                f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/reviews"
            )
        )

import os
import unittest

os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/revaudit-test-suite.db")
os.environ.setdefault("SESSION_SECRET", "test-secret")

import main  # noqa: E402
from auth import create_auth_session, resolve_auth_session, revoke_auth_session  # noqa: E402
from database import SessionLocal  # noqa: E402
from github_client import GitHubClient  # noqa: E402
from models import User  # noqa: E402
from reporting import build_audit_pdf  # noqa: E402


class FakeResponse:
    def __init__(self, items, next_url=None):
        self.status_code = 200
        self.headers = {}
        self.links = {"next": {"url": next_url}} if next_url else {}
        self._items = items

    def json(self):
        return self._items


class FakeSession:
    def __init__(self):
        self.headers = {}

    def get(self, url, params=None, timeout=None):
        if "page=2" in url:
            return FakeResponse([{"number": 3, "updated_at": "2026-01-01T00:00:00Z"}])
        return FakeResponse(
            [
                {"number": 1, "updated_at": "2026-01-03T00:00:00Z"},
                {"number": 2, "updated_at": "2026-01-02T00:00:00Z"},
            ],
            "https://api.github.com/page=2",
        )


class Phase2Tests(unittest.TestCase):
    def test_github_client_follows_link_header_and_stops_at_sync_point(self):
        client = GitHubClient(max_pages=5)
        client.session = FakeSession()
        self.assertEqual(
            [item["number"] for item in client.list_closed_pull_requests("o", "r")],
            [1, 2, 3],
        )
        self.assertEqual(
            [
                item["number"]
                for item in client.list_closed_pull_requests(
                    "o", "r", stop_before="2026-01-02T12:00:00+00:00"
                )
            ],
            [1],
        )

    def test_oauth_session_encrypts_and_revokes_token(self):
        db = SessionLocal()
        user = db.query(User).filter(User.github_id == 991991).first()
        if user is None:
            user = User(login="test-oauth-user", github_id=991991)
            db.add(user)
            db.commit()
            db.refresh(user)
        session_id = create_auth_session(db, user, "secret-github-token")
        context = resolve_auth_session(db, session_id)
        self.assertEqual(context.access_token, "secret-github-token")
        revoke_auth_session(db, session_id)
        self.assertIsNone(resolve_auth_session(db, session_id))
        db.close()

    def test_pdf_export_returns_pdf_bytes(self):
        payload = {
            "owner": "example",
            "repo": "repo",
            "total_closed_prs": 1,
            "merged_prs_count": 1,
            "unmerged_prs_dropped": 0,
            "anomalies_count": 0,
            "baseline_medians": {},
            "anomalies": [],
            "workload_summary": {"average_concurrent_prs": 0, "max_concurrent_prs": 0},
        }
        self.assertTrue(build_audit_pdf(payload).startswith(b"%PDF"))


if __name__ == "__main__":
    unittest.main()

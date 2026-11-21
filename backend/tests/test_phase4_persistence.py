import hashlib
import hmac
import os
import unittest
from unittest.mock import patch

os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/revaudit-test-suite.db")
os.environ.setdefault("SESSION_SECRET", "test-secret")

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from database import Base  # noqa: E402
from models import PullRequest, Repository, ReviewEvent, User  # noqa: E402
from persistence import persist_audit_result  # noqa: E402
from webhooks import (  # noqa: E402
    WebhookConfigurationError,
    _merge_review_events,
    should_process,
    verify_signature,
)

PAYLOAD = {
    "owner": "acme",
    "repo": "widgets",
    "pull_requests": [
        {
            "pr_number": 7,
            "title": "Add widget",
            "author": "alice",
            "state": "merged",
            "size_category": "Small",
            "body_length": 120,
            "additions": 10,
            "deletions": 2,
            "files_changed": 2,
            "html_url": "https://example.test/acme/widgets/pull/7",
            "created_at": "2026-01-01T00:00:00Z",
            "merged_at": "2026-01-02T00:00:00Z",
            "closed_at": "2026-01-02T00:00:00Z",
            "first_review": {
                "reviewer": "carol",
                "submitted_at": "2026-01-01T06:00:00Z",
            },
            "first_review_latency_hours": 6.0,
            "reviewer_activity_7d": 3,
            "reviewer_queue_at_creation": 2,
            "dynamic_threshold_ratio": 1.8,
            "dynamic_threshold_hours": 18.0,
            "workload_ratio_to_median": 0.6,
            "is_workload_anomaly": False,
            "is_anomaly": True,
            "review_rounds": 2,
            "human_reviews": [
                {
                    "reviewer": "carol",
                    "state": "commented",
                    "submitted_at": "2026-01-01T06:00:00Z",
                },
                {
                    "reviewer": "carol",
                    "state": "approved",
                    "submitted_at": "2026-01-01T12:00:00Z",
                },
            ],
        }
    ],
}


class PersistenceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:////tmp/revaudit-persistence-test.db")
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def test_audit_persists_and_is_idempotent(self):
        first = persist_audit_result(PAYLOAD, db=self.db)
        self.assertEqual(first, {"repositories": 1, "pull_requests": 1, "reviews": 2})

        second = persist_audit_result(PAYLOAD, db=self.db)
        self.assertEqual(second, {"repositories": 1, "pull_requests": 1, "reviews": 0})

        repository = self.db.query(Repository).one()
        self.assertEqual((repository.owner, repository.name), ("acme", "widgets"))

        pull_request = self.db.query(PullRequest).one()
        self.assertEqual(pull_request.title, "Add widget")
        self.assertEqual(pull_request.author.login, "alice")
        self.assertEqual(pull_request.reviewer_login, "carol")
        self.assertEqual(pull_request.reviewer_queue_at_creation, 2)
        self.assertAlmostEqual(pull_request.dynamic_threshold_ratio, 1.8)
        self.assertAlmostEqual(pull_request.dynamic_threshold_hours, 18.0)
        self.assertAlmostEqual(pull_request.workload_ratio_to_median, 0.6)
        self.assertFalse(pull_request.is_workload_anomaly)
        self.assertTrue(pull_request.is_anomaly)
        self.assertEqual(pull_request.review_count, 2)
        self.assertEqual(self.db.query(ReviewEvent).count(), 2)
        self.assertEqual(
            sorted(user.login for user in self.db.query(User).all()),
            ["alice", "carol"],
        )

    def test_incomplete_payload_is_ignored(self):
        counts = persist_audit_result({"owner": "acme", "repo": "widgets"}, db=self.db)
        self.assertEqual(counts, {"repositories": 0, "pull_requests": 0, "reviews": 0})


class WebhookSignatureTests(unittest.TestCase):
    def test_valid_signature(self):
        body = b'{"action":"closed"}'
        signature = "sha256=" + hmac.new(
            b"secret", body, hashlib.sha256
        ).hexdigest()
        with patch.dict(os.environ, {"GITHUB_WEBHOOK_SECRET": "secret"}):
            self.assertTrue(verify_signature(body, signature))

    def test_invalid_signature(self):
        with patch.dict(os.environ, {"GITHUB_WEBHOOK_SECRET": "secret"}):
            self.assertFalse(verify_signature(b"{}", "sha256=deadbeef"))
            self.assertFalse(verify_signature(b"{}", None))

    def test_missing_secret_refuses_webhook(self):
        with patch.dict(os.environ, {"GITHUB_WEBHOOK_SECRET": ""}):
            with self.assertRaises(WebhookConfigurationError):
                verify_signature(b"{}", "sha256=deadbeef")

    def test_event_filter(self):
        self.assertTrue(should_process("pull_request", "closed"))
        self.assertFalse(should_process("pull_request", "opened"))
        self.assertFalse(should_process("push", "closed"))


class WebhookReviewMergeTests(unittest.TestCase):
    def test_merge_enriches_ids_and_recomputes_first_review(self):
        record = {
            "author": "alice",
            "created_at": "2026-01-01T00:00:00Z",
            "human_reviews": [],
        }
        reviews = [
            {
                "id": 99,
                "user": {"login": "carol"},
                "state": "APPROVED",
                "submitted_at": "2026-01-01T05:00:00Z",
                "body": "LGTM",
            }
        ]
        _merge_review_events(record, reviews)

        self.assertEqual(len(record["human_reviews"]), 1)
        self.assertEqual(record["human_reviews"][0]["github_review_id"], 99)
        self.assertEqual(record["first_review"]["reviewer"], "carol")
        self.assertEqual(record["first_review_latency_hours"], 5.0)
        self.assertTrue(record["first_review_observed"])
        self.assertEqual(record["censoring_status"], "first_review")

    def test_merge_filters_bots_and_authors(self):
        record = {
            "author": "alice",
            "created_at": "2026-01-01T00:00:00Z",
            "human_reviews": [],
        }
        reviews = [
            {
                "id": 1,
                "user": {"login": "dependabot[bot]"},
                "state": "COMMENTED",
                "submitted_at": "2026-01-01T01:00:00Z",
            },
            {
                "id": 2,
                "user": {"login": "alice"},
                "state": "COMMENTED",
                "submitted_at": "2026-01-01T02:00:00Z",
            },
        ]
        _merge_review_events(record, reviews)
        self.assertEqual(record["human_reviews"], [])


if __name__ == "__main__":
    unittest.main()

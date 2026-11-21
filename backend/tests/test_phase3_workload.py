import os
import unittest

os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/revaudit-test-suite.db")
os.environ.setdefault("SESSION_SECRET", "test-secret")

from statistical_engine import (  # noqa: E402
    BASE_ANOMALY_RATIO,
    QUEUE_PRESSURE_INCREMENT,
    annotate_workload_thresholds,
)


def pr(number, created, closed=None, reviewer="alice", latency=5.0, requests=None):
    return {
        "pr_number": number,
        "title": f"PR {number}",
        "author": "bob",
        "size_category": "Small",
        "created_at": created,
        "closed_at": closed,
        "merged_at": None,
        "html_url": f"https://example.test/pr/{number}",
        "first_review": {"reviewer": reviewer, "submitted_at": created},
        "first_review_latency_hours": latency,
        "review_requests": requests or [],
    }


class WorkloadThresholdTests(unittest.TestCase):
    def setUp(self):
        self.baselines = {"Small": {"median_hours": 10.0}}

    def test_active_queue_widens_threshold(self):
        older = pr(
            1,
            "2026-01-01T00:00:00Z",
            requests=[
                {"reviewer": "alice", "requested_at": "2026-01-01T01:00:00Z"}
            ],
        )
        newer = pr(
            2,
            "2026-01-02T00:00:00Z",
            closed="2026-01-05T00:00:00Z",
            latency=20.0,
            requests=[
                {"reviewer": "alice", "requested_at": "2026-01-02T00:00:00Z"}
            ],
        )
        flagged, summary = annotate_workload_thresholds(
            [older, newer], self.baselines
        )

        self.assertEqual(older["reviewer_queue_at_creation"], 0)
        self.assertEqual(newer["reviewer_queue_at_creation"], 1)
        self.assertAlmostEqual(
            newer["dynamic_threshold_ratio"],
            BASE_ANOMALY_RATIO + QUEUE_PRESSURE_INCREMENT,
            3,
        )
        self.assertAlmostEqual(newer["dynamic_threshold_hours"], 16.5, 2)
        self.assertTrue(newer["is_workload_anomaly"])
        self.assertEqual([row["pr_number"] for row in flagged], [2])
        self.assertEqual(summary["flagged_count"], 1)
        self.assertEqual(summary["request_coverage_pct"], 100.0)
        self.assertAlmostEqual(summary["average_queue_at_creation"], 0.5, 2)

    def test_closed_pr_does_not_count_in_queue(self):
        older = pr(
            1,
            "2026-01-01T00:00:00Z",
            closed="2026-01-01T12:00:00Z",
            requests=[
                {"reviewer": "alice", "requested_at": "2026-01-01T01:00:00Z"}
            ],
        )
        newer = pr(
            2,
            "2026-01-02T00:00:00Z",
            requests=[
                {"reviewer": "alice", "requested_at": "2026-01-02T00:00:00Z"}
            ],
        )
        annotate_workload_thresholds([older, newer], self.baselines)
        self.assertEqual(newer["reviewer_queue_at_creation"], 0)
        self.assertAlmostEqual(newer["dynamic_threshold_ratio"], 1.5, 3)

    def test_empty_queue_enforces_base_threshold(self):
        row = pr(1, "2026-01-01T00:00:00Z", latency=16.0)
        flagged, summary = annotate_workload_thresholds([row], self.baselines)
        self.assertIsNone(row["reviewer_queue_at_creation"])
        self.assertAlmostEqual(row["dynamic_threshold_ratio"], 1.5, 3)
        self.assertAlmostEqual(row["dynamic_threshold_hours"], 15.0, 2)
        self.assertTrue(row["is_workload_anomaly"])
        self.assertEqual(summary["flagged_count"], 1)
        self.assertEqual(summary["request_coverage_pct"], 0.0)
        self.assertIsNone(summary["average_queue_at_creation"])

    def test_missing_median_skips_threshold(self):
        row = pr(1, "2026-01-01T00:00:00Z", latency=100.0)
        flagged, summary = annotate_workload_thresholds(
            [row], {"Small": {"median_hours": None}}
        )
        self.assertIsNone(row["dynamic_threshold_hours"])
        self.assertFalse(row["is_workload_anomaly"])
        self.assertEqual(flagged, [])
        self.assertEqual(summary["flagged_count"], 0)


if __name__ == "__main__":
    unittest.main()

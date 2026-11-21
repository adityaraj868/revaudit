import os
import unittest

os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/revaudit-test-suite.db")
os.environ.setdefault("SESSION_SECRET", "test-secret")

from reporting import build_audit_pdf  # noqa: E402


class ReportingV2Tests(unittest.TestCase):
    def test_v2_payload_with_missing_medians_renders(self):
        payload = {
            "owner": "fastapi",
            "repo": "fastapi",
            "metadata": {"analysis_version": "2.0.0", "as_of": "2026-11-21T00:00:00Z"},
            "total_prs_in_sample": 10,
            "merged_prs_count": 7,
            "first_review_observed_count": 0,
            "first_review_censored_count": 10,
            "observed_median_first_review_hours": None,
            "anomalies_count": 1,
            "baseline_medians": {
                "Small": {
                    "sample_size": 2,
                    "event_count": 1,
                    "censored_count": 1,
                    "median_hours": 12.5,
                    "confidence_interval_95": [8.0, 20.0],
                    "estimate_status": "estimated",
                },
                "Medium": {
                    "sample_size": 3,
                    "event_count": 0,
                    "censored_count": 3,
                    "median_hours": None,
                    "confidence_interval_95": None,
                    "estimate_status": "median_not_reached",
                },
            },
            "anomalies": [
                {
                    "pr_number": 7,
                    "author": "alice",
                    "size_category": "Small",
                    "first_review_latency_hours": 40.0,
                    "expected_first_review_hours": 12.0,
                    "standardized_residual": 3.1,
                    "anomaly_direction": "longer_than_expected",
                }
            ],
            "workload_engine": {
                "flagged_count": 1,
                "average_queue_at_creation": 1.5,
                "request_coverage_pct": 80.0,
            },
            "workload_anomalies": [
                {
                    "pr_number": 7,
                    "first_reviewer": "carol",
                    "reviewer_queue_at_creation": 3,
                    "dynamic_threshold_ratio": 1.95,
                    "dynamic_threshold_hours": 24.38,
                    "first_review_latency_hours": 40.0,
                    "workload_ratio_to_median": 3.2,
                }
            ],
            "workload_summary": {
                "average_concurrent_prs": 1.2,
                "max_concurrent_prs": 4,
                "sample_size": 9,
                "review_event_count": 14,
                "definition": "test definition",
            },
        }

        pdf = build_audit_pdf(payload)
        self.assertTrue(pdf.startswith(b"%PDF"))
        self.assertGreater(len(pdf), 1000)

    def test_legacy_payload_still_renders(self):
        payload = {
            "owner": "legacy",
            "repo": "repo",
            "total_closed_prs": 5,
            "merged_prs_count": 3,
            "unmerged_prs_dropped": 2,
            "baseline_medians": {
                "Small": {
                    "median_hours": 2.0,
                    "sample_size": 3,
                    "mock_ci_90": [1.0, 3.0],
                }
            },
            "anomalies": [
                {
                    "pr_number": 1,
                    "author": "bob",
                    "size_category": "Small",
                    "review_time_hours": 6.0,
                    "anomaly_ratio": 3.0,
                }
            ],
        }
        pdf = build_audit_pdf(payload)
        self.assertTrue(pdf.startswith(b"%PDF"))


if __name__ == "__main__":
    unittest.main()

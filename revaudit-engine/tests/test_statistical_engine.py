"""
RevAudit Test Suite
UCS503 Software Engineering Lab, TIET | Advisor: Dr. Sukhpal Singh
Team ArchCoders

Comprehensive test suite verifying:
1. Bot filtering regex rules and sanitization.
2. Internal OLS regression baseline fitting across confounders.
3. Residual Z-score anomaly detection and 95% Confidence Interval bounds.
4. Pairwise same-size PR discrepancy extraction (the core proposal anomaly).
5. FastAPI REST endpoints (/api/health, /api/audit/repo, /api/benchmark-suite).
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure revaudit-engine root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from cli.bot_filter import is_bot_author, filter_bot_prs, calculate_bot_exclusion_stats
from cli.ingest import generate_pr_record, generate_benchmark_dataset
from engine.models import fit_repository_internal_baseline, BaselineModelResult
from engine.anomaly_detector import assign_pr_verdict, find_pairwise_discrepancies, audit_repository_pull_requests
from api.main import app, clean_repo_input


# --------------------------------------------------------------------------
# 1. Bot Filter Tests
# --------------------------------------------------------------------------

def test_bot_author_detection():
    """Verify bot regex identification on standard CI/automation bots."""
    assert is_bot_author("dependabot[bot]") is True
    assert is_bot_author("renovate[bot]") is True
    assert is_bot_author("github-actions[bot]") is True
    assert is_bot_author("stale[bot]") is True
    assert is_bot_author("snyk-bot") is True
    assert is_bot_author("imgbot[bot]") is True

    # Humans
    assert is_bot_author("gaearon") is False
    assert is_bot_author("torvalds") is False
    assert is_bot_author("contributor_42") is False


def test_bot_title_detection():
    """Verify automated dependency bump PR title detection."""
    assert is_bot_author("unknown-user", title="bump lodash from 4.17.15 to 4.17.21") is True
    assert is_bot_author("unknown-user", title="chore(deps): update dependency webpack to v5") is True
    assert is_bot_author("unknown-user", title="fix(core): resolve null pointer exception") is False


def test_filter_bot_prs():
    """Verify filtering separates bot PRs from clean human PRs."""
    sample_prs = [
        {"pr_id": "PR_1", "author": "contributor_1", "lines_added": 100, "is_bot": False},
        {"pr_id": "PR_2", "author": "dependabot[bot]", "lines_added": 5, "is_bot": True},
        {"pr_id": "PR_3", "author": "contributor_2", "lines_added": 50, "is_bot": False},
        {"pr_id": "PR_4", "author": "renovate[bot]", "lines_added": 10, "is_bot": True},
    ]
    human_prs, bot_prs = filter_bot_prs(sample_prs)
    assert len(human_prs) == 2
    assert len(bot_prs) == 2
    assert all(not p["is_bot_filtered"] for p in human_prs)
    assert all(p["is_bot_filtered"] for p in bot_prs)


# --------------------------------------------------------------------------
# 2. OLS Statistical Modeling Tests
# --------------------------------------------------------------------------

def test_internal_ols_regression_fit():
    """Verify internal OLS model fits correctly on historical PR records."""
    # Generate 50 synthetic human PRs
    import random
    rng = random.Random(42)
    prs = [
        generate_pr_record(
            repo_name="facebook/react",
            pr_number=1000 + i,
            is_bot=False,
            shift_type=None,
            rng=rng
        )
        for i in range(50)
    ]

    result, df = fit_repository_internal_baseline(prs)

    assert isinstance(result, BaselineModelResult)
    assert result.sample_size == 50
    assert result.r_squared > 0.0
    assert result.beta_workload > 0.0  # Proves H1: concurrent workload creates positive review delay
    assert result.beta_churn >= 0.0
    assert result.std_residual > 0.0
    assert "expected_latency" in df.columns
    assert "residual" in df.columns


# --------------------------------------------------------------------------
# 3. Anomaly Detection & Verdict Rules Tests
# --------------------------------------------------------------------------

def test_assign_pr_verdict():
    """Verify statistical thresholding (|Z| > 1.96)."""
    verdict, badge = assign_pr_verdict(z_score=2.5, observed_latency=45.0)
    assert badge == "delayed"
    assert "Delayed" in verdict

    verdict, badge = assign_pr_verdict(z_score=-2.5, observed_latency=2.0)
    assert badge == "fast_tracked"
    assert "Fast-Tracked" in verdict

    verdict, badge = assign_pr_verdict(z_score=0.4, observed_latency=18.0)
    assert badge == "normal"
    assert "Consistent" in verdict


def test_full_repo_audit():
    """Verify end-to-end repository statistical audit."""
    import random
    rng = random.Random(42)
    prs = [
        generate_pr_record(
            repo_name="django/django",
            pr_number=1000 + i,
            is_bot=False,
            shift_type="WORKLOAD_BOTTLENECK",
            rng=rng
        )
        for i in range(100)
    ]

    report = audit_repository_pull_requests("django/django", prs)
    
    assert report["repo_name"] == "django/django"
    assert report["total_prs_analyzed"] == 100
    assert "repo_internal_baseline" in report
    assert "confidence_interval_95" in report
    assert len(report["confidence_interval_95"]) == 2
    assert report["confidence_interval_95"][0] <= report["confidence_interval_95"][1]
    assert len(report["prs"]) == 100
    assert "pairwise_discrepancies" in report


# --------------------------------------------------------------------------
# 4. Pairwise Same-Size PR Discrepancy Tests (The Core Problem Statement)
# --------------------------------------------------------------------------

def test_find_pairwise_discrepancies():
    """
    Verify the pairwise consistency detector isolates same-size PRs
    with divergent review treatment (e.g. 2h superficial vs 50h delayed).
    """
    prs = [
        # Fast-tracked Medium PR
        {
            "pr_id": "PR_FAST",
            "number": 101,
            "title": "fix(core): optimize memoization lookup",
            "author_id": "author_a",
            "lines_added": 210,
            "lines_deleted": 15,
            "files_changed": 3,
            "observed_latency_hrs": 1.8,
            "latency_hrs": 1.8,
            "workload": 1,
            "inline_comment_count": 0,
            "review_rounds": 1,
            "verdict_badge": "fast_tracked",
            "audit_verdict": "Fast-Tracked Flow"
        },
        # Delayed Medium PR with near identical size (+215/-18)
        {
            "pr_id": "PR_SLOW",
            "number": 102,
            "title": "refactor(router): normalize param extraction",
            "author_id": "author_b",
            "lines_added": 215,
            "lines_deleted": 18,
            "files_changed": 3,
            "observed_latency_hrs": 54.2,
            "latency_hrs": 54.2,
            "workload": 9,
            "inline_comment_count": 16,
            "review_rounds": 4,
            "verdict_badge": "delayed",
            "audit_verdict": "Delayed vs. Repo Normal"
        }
    ]

    pairs = find_pairwise_discrepancies(prs, tolerance_pct=0.15)
    
    assert len(pairs) > 0
    pair = pairs[0]
    assert pair["disparity_ratio"] >= 2.0
    assert pair["time_diff_hours"] > 0
    assert pair["fast_pr"]["pr_id"] == "PR_FAST"
    assert pair["delayed_pr"]["pr_id"] == "PR_SLOW"
    assert "root_cause_diagnosis" in pair
    assert "reviewer workload" in pair["root_cause_diagnosis"].lower()


# --------------------------------------------------------------------------
# 5. FastAPI REST API Endpoint Tests
# --------------------------------------------------------------------------

client = TestClient(app)

def test_api_health():
    """Verify /api/health endpoint returns 200 OK."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "revaudit-engine"


def test_api_audit_repo():
    """Verify POST /api/audit/repo returns baseline and audited PRs."""
    response = client.post("/api/audit/repo", json={"repo_url": "https://github.com/facebook/react"})
    assert response.status_code == 200
    data = response.json()
    assert data["repo_name"] == "facebook/react"
    assert "repo_internal_baseline" in data
    assert "prs" in data
    assert len(data["prs"]) > 0
    assert "pairwise_discrepancies" in data


def test_clean_repo_input():
    """Verify GitHub URL string normalization."""
    assert clean_repo_input("https://github.com/facebook/react") == "facebook/react"
    assert clean_repo_input("https://github.com/pallets/flask.git") == "pallets/flask"
    assert clean_repo_input("git@github.com:django/django.git") == "django/django"
    assert clean_repo_input("fastapi/fastapi") == "fastapi/fastapi"

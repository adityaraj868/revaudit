"""Statistical routines for the RevAudit PR review-process audit."""

from bisect import bisect_left
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Sequence

import numpy as np

BOT_PATTERNS = ("dependabot", "renovate", "github-actions", "codecov",
                "greenkeeper", "stale", "semantic-release-bot", "snyk-bot", "imgbot")
COHORTS = ("Small", "Medium", "Large", "Unknown")
BOOTSTRAP_ITERATIONS = 500
MIN_COHORT_FOR_INTERVAL = 10
MIN_MODEL_SAMPLE = 25
MODEL_RESIDUAL_Z_THRESHOLD = 2.5


def is_bot(username: str) -> bool:
    value = (username or "").lower()
    return value.endswith("[bot]") or any(pattern in value for pattern in BOT_PATTERNS)


def parse_timestamp(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return (parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)).astimezone(timezone.utc)
    except (TypeError, ValueError):
        return None


def hours_between(start: Optional[datetime], end: Optional[datetime]) -> Optional[float]:
    if start is None or end is None:
        return None
    hours = (end - start).total_seconds() / 3600.0
    return round(hours, 2) if hours >= 0 else None


def classify_complexity(additions: Optional[int], deletions: Optional[int], files: Optional[int]) -> str:
    if additions is None or deletions is None or files is None:
        return "Unknown"
    churn, file_count = max(0, additions) + max(0, deletions), max(0, files)
    if churn <= 100 and file_count <= 5:
        return "Small"
    if churn <= 1000 and file_count <= 20:
        return "Medium"
    return "Large"


def _km_median(records: Sequence[Dict[str, Any]]) -> Optional[float]:
    valid = [
        (float(row["duration_hours"]), bool(row["event_observed"]))
        for row in records
        if row.get("duration_hours") is not None and float(row["duration_hours"]) >= 0
        and row.get("event_observed") is not None
    ]
    if not valid:
        return None
    at_risk, survival = len(valid), 1.0
    for time in sorted({t for t, event in valid if event}):
        events = sum(1 for t, event in valid if t == time and event)
        censored = sum(1 for t, event in valid if t == time and not event)
        if at_risk:
            survival *= 1.0 - events / at_risk
        if survival <= 0.5:
            return round(time, 2)
        at_risk -= events + censored
    return None


def bootstrap_km_interval(records: Sequence[Dict[str, Any]], seed: int = 42) -> Optional[List[float]]:
    if len(records) < MIN_COHORT_FOR_INTERVAL or sum(bool(r.get("event_observed")) for r in records) < 5:
        return None
    rng = np.random.default_rng(seed)
    estimates: List[float] = []
    for chosen in rng.integers(0, len(records), size=(BOOTSTRAP_ITERATIONS, len(records))):
        estimate = _km_median([records[int(index)] for index in chosen])
        if estimate is not None:
            estimates.append(estimate)
    if len(estimates) < int(BOOTSTRAP_ITERATIONS * 0.8):
        return None
    lower, upper = np.percentile(estimates, [2.5, 97.5])
    return [round(float(lower), 2), round(float(upper), 2)]


def cohort_baselines(pull_requests: Sequence[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    result = {}
    for index, cohort in enumerate(COHORTS):
        group = [pr for pr in pull_requests if pr.get("size_category") == cohort and pr.get("review_time_observed") is not None]
        median, ci = _km_median(group), bootstrap_km_interval(group, seed=42 + index)
        result[cohort] = {
            "median_hours": median,
            "sample_size": len(group),
            "event_count": sum(bool(pr.get("first_review_observed")) for pr in group),
            "censored_count": sum(not bool(pr.get("first_review_observed")) for pr in group),
            "confidence_interval_95": ci,
            "interval_method": "nonparametric bootstrap of Kaplan-Meier median" if ci else None,
            "estimate_status": "estimated" if median is not None else "median_not_reached",
        }
    return result


def _design_row(pr: Dict[str, Any]) -> List[float]:
    churn = (pr.get("additions") or 0) + (pr.get("deletions") or 0)
    files = pr.get("files_changed") or 0
    return [1.0, float(np.log1p(max(0, churn))), float(np.log1p(max(0, files))),
            1.0 if pr.get("is_first_time_contributor") else 0.0,
            float(np.log1p(max(0, pr.get("reviewer_activity_7d") or 0)))]


def fit_robust_latency_model(pull_requests: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    observed = [
        pr for pr in pull_requests
        if pr.get("first_review_observed") and pr.get("first_review_latency_hours") is not None
        and pr.get("additions") is not None and pr.get("deletions") is not None
        and pr.get("files_changed") is not None and pr.get("reviewer_activity_7d") is not None
    ]
    base = {"method": "Huber robust regression on log(1 + hours)", "sample_size": len(observed),
            "minimum_sample_size": MIN_MODEL_SAMPLE}
    if len(observed) < MIN_MODEL_SAMPLE:
        return {**base, "status": "insufficient_data"}

    x = np.asarray([_design_row(pr) for pr in observed], dtype=float)
    y = np.log1p(np.asarray([pr["first_review_latency_hours"] for pr in observed], dtype=float))
    keep = [0] + [column for column in range(1, x.shape[1]) if np.ptp(x[:, column]) > 1e-9]
    x = x[:, keep]
    if np.linalg.matrix_rank(x) < x.shape[1]:
        return {**base, "status": "insufficient_variation"}

    beta = np.linalg.lstsq(x, y, rcond=None)[0]
    for _ in range(30):
        residual = y - x @ beta
        center = float(np.median(residual))
        scale = 1.4826 * float(np.median(np.abs(residual - center)))
        if scale < 1e-8:
            break
        standardized = np.abs(residual - center) / scale
        weights = np.where(standardized <= 1.345, 1.0, 1.345 / np.maximum(standardized, 1e-12))
        root_weights = np.sqrt(weights)
        updated = np.linalg.lstsq(x * root_weights[:, None], y * root_weights, rcond=None)[0]
        if np.max(np.abs(updated - beta)) < 1e-7:
            beta = updated
            break
        beta = updated

    residual = y - x @ beta
    center = float(np.median(residual))
    residual_scale = 1.4826 * float(np.median(np.abs(residual - center)))
    if residual_scale < 1e-8:
        residual_scale = float(np.std(residual, ddof=1)) if len(residual) > 1 else 0.0
    fitted = x @ beta
    total = float(np.sum((y - np.mean(y)) ** 2))
    r_squared = 1 - float(np.sum((y - fitted) ** 2)) / total if total > 1e-12 else None
    all_names = ["intercept", "log1p(change churn)", "log1p(files changed)",
                 "first-time contributor", "log1p(reviewer activity, prior 7 days)"]
    active_names = [all_names[column] for column in keep]
    predictions = {}
    for pr in observed:
        expected_log = float(np.asarray(_design_row(pr), dtype=float)[keep] @ beta)
        expected_hours = max(0.0, float(np.expm1(expected_log)))
        residual_log = float(np.log1p(pr["first_review_latency_hours"]) - expected_log)
        z_score = (residual_log - center) / residual_scale if residual_scale > 0 else 0.0
        predictions[int(pr["pr_number"])] = {
            "expected_first_review_hours": round(expected_hours, 2),
            "standardized_residual": round(float(z_score), 3),
        }
    return {
        **base,
        "status": "fitted",
        "features": active_names[1:],
        "coefficients": {name: round(float(value), 6) for name, value in zip(active_names, beta)},
        "residual_mad_log_scale": round(float(residual_scale), 6),
        "r_squared_descriptive": round(r_squared, 4) if r_squared is not None else None,
        "triage_threshold_abs_z": MODEL_RESIDUAL_Z_THRESHOLD,
        "predictions": predictions,
    }


def reviewer_activity(pull_requests: Sequence[Dict[str, Any]]) -> None:
    by_reviewer: Dict[str, List[datetime]] = {}
    for pr in pull_requests:
        for review in pr.get("human_reviews", []):
            actor, submitted = review.get("reviewer"), parse_timestamp(review.get("submitted_at"))
            if actor and submitted:
                by_reviewer.setdefault(actor.lower(), []).append(submitted)
    for dates in by_reviewer.values():
        dates.sort()
    week = timedelta(days=7)
    for pr in pull_requests:
        first = pr.get("first_review")
        actor = (first or {}).get("reviewer", "").lower()
        at = parse_timestamp((first or {}).get("submitted_at"))
        dates = by_reviewer.get(actor, [])
        pr["reviewer_activity_7d"] = (
            bisect_left(dates, at) - bisect_left(dates, at - week)
            if actor and at else None
        )


def build_pull_request_record(raw: Dict[str, Any], detail: Optional[Dict[str, Any]],
                              timeline: Optional[List[Dict[str, Any]]],
                              observed_at: datetime) -> Dict[str, Any]:
    pr_detail = detail or raw
    author = (raw.get("user") or {}).get("login", "unknown")
    created, merged, closed = (parse_timestamp(raw.get(key)) for key in ("created_at", "merged_at", "closed_at"))
    events = timeline or []
    reviews, author_comments, requested_times = [], [], []
    for event in events:
        event_type = event.get("event")
        if event_type == "reviewed":
            user = event.get("user") or event.get("actor") or {}
            reviewer = user.get("login", "")
            state = (event.get("state") or "commented").lower()
            submitted = event.get("submitted_at") or event.get("created_at")
            if (reviewer and reviewer.lower() != author.lower() and not is_bot(reviewer)
                    and state in {"approved", "changes_requested", "commented"} and submitted):
                reviews.append({"reviewer": reviewer, "state": state, "submitted_at": submitted})
        elif event_type == "commented":
            user = event.get("user") or event.get("actor") or {}
            if user.get("login", "").lower() == author.lower() and event.get("created_at"):
                author_comments.append(event["created_at"])
        elif event_type == "review_requested":
            requested = parse_timestamp(event.get("created_at"))
            if requested:
                requested_times.append(requested)

    reviews.sort(key=lambda item: item["submitted_at"])
    author_comments.sort()
    first_review = reviews[0] if reviews else None
    first_review_at = parse_timestamp(first_review.get("submitted_at")) if first_review else None
    eligible_at = created
    if raw.get("draft"):
        ready_times = [parse_timestamp(event.get("created_at")) for event in events if event.get("event") == "ready_for_review"]
        ready_times = [value for value in ready_times if value]
        if ready_times:
            eligible_at = min(ready_times)
    terminal_at = merged or closed or observed_at
    review_latency = hours_between(eligible_at, first_review_at) if first_review_at else None
    duration = review_latency if review_latency is not None else hours_between(eligible_at, terminal_at)

    author_response = None
    if first_review_at:
        response_times = [parse_timestamp(value) for value in author_comments]
        response_times = [value for value in response_times if value and value >= first_review_at]
        if response_times:
            author_response = hours_between(first_review_at, min(response_times))
    approved = [parse_timestamp(review["submitted_at"]) for review in reviews if review["state"] == "approved"]
    approved = [value for value in approved if value and (merged is None or value <= merged)]
    final_approval = max(approved) if approved else None
    earlier_requests = [value for value in requested_times if first_review_at and value <= first_review_at]
    first_request = max(earlier_requests) if earlier_requests else None

    def to_int(value: Any) -> Optional[int]:
        try:
            return int(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    additions, deletions, files = (to_int(pr_detail.get(key)) for key in ("additions", "deletions", "changed_files"))
    association = raw.get("author_association", "")
    return {
        "pr_number": int(raw.get("number", 0)),
        "title": str(raw.get("title") or f"PR #{raw.get('number', '')}"),
        "author": author,
        "author_association": association,
        "is_first_time_contributor": association.upper() in {"FIRST_TIMER", "FIRST_TIME_CONTRIBUTOR"},
        "is_bot_author": is_bot(author),
        "state": "merged" if merged else ("closed_unmerged" if closed else "open"),
        "is_merged": bool(merged),
        "is_open": closed is None and merged is None,
        "is_draft": bool(raw.get("draft", False)),
        "created_at": raw.get("created_at"),
        "ready_for_review_at": eligible_at.isoformat() if eligible_at and eligible_at != created else None,
        "closed_at": raw.get("closed_at"),
        "merged_at": raw.get("merged_at"),
        "html_url": str(raw.get("html_url", "")),
        "body_length": len(str(raw.get("body") or "")),
        "additions": additions,
        "deletions": deletions,
        "changed_lines": additions + deletions if additions is not None and deletions is not None else None,
        "files_changed": files,
        "size_category": classify_complexity(additions, deletions, files),
        "timeline_available": timeline is not None,
        "first_review_observed": first_review is not None if timeline is not None else None,
        "first_review": first_review,
        "first_review_latency_hours": review_latency,
        "review_time_observed": duration if timeline is not None else None,
        "event_observed": first_review is not None if timeline is not None else None,
        "censoring_status": "first_review" if first_review else ("closed_without_first_review" if closed else "right_censored_as_of_audit"),
        "time_to_first_review_request_hours": hours_between(first_request, first_review_at) if first_request and first_review_at else None,
        "author_response_after_first_review_hours": author_response,
        "approval_to_merge_hours": hours_between(final_approval, merged) if final_approval and merged else None,
        "created_to_merge_hours": hours_between(created, merged),
        "review_rounds": len(reviews),
        "human_reviews": reviews,
        "reviewer_activity_7d": None,
        "duration_hours": duration,
    }


def finalize_analysis(pull_requests: List[Dict[str, Any]], owner: str, repo: str,
                      metadata: Dict[str, Any]) -> Dict[str, Any]:
    reviewer_activity(pull_requests)
    analysis_records = [pr for pr in pull_requests if not pr.get("is_bot_author")]
    baselines = cohort_baselines(analysis_records)
    model = fit_robust_latency_model(analysis_records)
    predictions = model.pop("predictions", {})
    anomalies: List[Dict[str, Any]] = []
    for pr in pull_requests:
        prediction = predictions.get(pr["pr_number"])
        pr["expected_first_review_hours"] = prediction["expected_first_review_hours"] if prediction else None
        pr["standardized_residual"] = prediction["standardized_residual"] if prediction else None
        pr["anomaly_direction"], pr["is_anomaly"] = None, False
        residual = pr["standardized_residual"]
        if model.get("status") == "fitted" and residual is not None and pr.get("first_review_observed"):
            if residual >= MODEL_RESIDUAL_Z_THRESHOLD:
                pr["anomaly_direction"], pr["is_anomaly"] = "longer_than_expected", True
            elif residual <= -MODEL_RESIDUAL_Z_THRESHOLD:
                pr["anomaly_direction"], pr["is_anomaly"] = "shorter_than_expected", True
        if pr["is_anomaly"]:
            anomalies.append({
                "pr_number": pr["pr_number"], "title": pr["title"], "author": pr["author"],
                "size_category": pr["size_category"], "body_length": pr["body_length"],
                "changed_lines": pr["changed_lines"], "files_changed": pr["files_changed"],
                "review_time_hours": pr["first_review_latency_hours"],
                "group_median_hours": baselines[pr["size_category"]]["median_hours"],
                "expected_first_review_hours": pr["expected_first_review_hours"],
                "standardized_residual": residual, "anomaly_direction": pr["anomaly_direction"],
                "threshold_abs_z": MODEL_RESIDUAL_Z_THRESHOLD, "html_url": pr["html_url"],
                "created_at": pr["created_at"], "merged_at": pr["merged_at"],
            })
    anomalies.sort(key=lambda row: abs(row["standardized_residual"] or 0), reverse=True)
    observed = [pr["first_review_latency_hours"] for pr in analysis_records if pr.get("first_review_observed") and pr.get("first_review_latency_hours") is not None]
    stage_fields = {
        "request_to_first_review": "time_to_first_review_request_hours",
        "author_response_after_first_review": "author_response_after_first_review_hours",
        "approval_to_merge": "approval_to_merge_hours",
    }
    stage_metrics = {}
    for stage, field in stage_fields.items():
        values = [float(pr[field]) for pr in analysis_records if pr.get(field) is not None]
        stage_metrics[stage] = {
            "sample_size": len(values),
            "median_hours": round(float(np.median(values)), 2) if values else None,
            "measurement_note": "author issue-comment response proxy" if stage == "author_response_after_first_review" else None,
        }
    workload_points = [
        (float(pr["reviewer_activity_7d"]), float(pr["first_review_latency_hours"]))
        for pr in analysis_records
        if pr.get("reviewer_activity_7d") is not None
        and pr.get("first_review_latency_hours") is not None
    ]
    workload_values = [point[0] for point in workload_points]
    workload_correlation = None
    workload_slope = None
    if len(workload_points) >= 2 and len({point[0] for point in workload_points}) > 1:
        xs = np.asarray([point[0] for point in workload_points], dtype=float)
        ys = np.asarray([point[1] for point in workload_points], dtype=float)
        workload_slope = float(np.polyfit(xs, ys, 1)[0])
        if len({float(value) for value in ys}) > 1:
            workload_correlation = float(np.corrcoef(xs, ys)[0, 1])
    workload_summary = {
        "average_concurrent_prs": round(float(np.mean(workload_values)), 2)
        if workload_values
        else 0.0,
        "max_concurrent_prs": int(max(workload_values)) if workload_values else 0,
        "correlation_with_first_review_hours": (
            round(workload_correlation, 3)
            if workload_correlation is not None
            else None
        ),
        "slope_hours_per_concurrent_pr": (
            round(workload_slope, 3) if workload_slope is not None else None
        ),
        "sample_size": len(workload_points),
        "review_event_count": sum(len(pr.get("human_reviews", [])) for pr in analysis_records),
        "definition": (
            "Human review events by the eventual first reviewer in the prior seven days; "
            "this is a workload proxy, not a complete assignment count."
        ),
    }
    timeline_complete = sum(bool(pr.get("timeline_available")) for pr in pull_requests)
    ci_cohorts = sum(bool(group.get("confidence_interval_95")) for group in baselines.values())
    warnings = []
    bot_count = sum(bool(pr.get("is_bot_author")) for pr in pull_requests)
    if bot_count:
        warnings.append(f"Excluded {bot_count} bot-authored PRs from cohort and adjusted model estimates.")
    if timeline_complete < len(pull_requests):
        warnings.append("Some review timelines could not be fetched; those PRs are excluded from survival estimates.")
    if model.get("status") != "fitted":
        warnings.append(f"Adjusted anomaly scoring is unavailable: {model.get('status')} (requires at least {MIN_MODEL_SAMPLE} observed first reviews with complete model inputs).")
    if ci_cohorts < sum(bool(group["sample_size"]) for group in baselines.values()):
        warnings.append("Some cohort confidence intervals are unavailable because the event count, sample size, or censoring was insufficient.")
    return {
        "owner": owner, "repo": repo,
        "total_prs_in_sample": len(pull_requests),
        "human_authored_prs_count": len(analysis_records),
        "bot_authored_prs_excluded_count": bot_count,
        "merged_prs_count": sum(bool(pr["is_merged"]) for pr in pull_requests),
        "unmerged_closed_prs_count": sum(pr["state"] == "closed_unmerged" for pr in pull_requests),
        "open_prs_count": sum(bool(pr["is_open"]) for pr in pull_requests),
        "first_review_observed_count": len(observed),
        "first_review_censored_count": sum(pr.get("event_observed") is False for pr in pull_requests if pr.get("timeline_available")),
        "observed_median_first_review_hours": round(float(np.median(observed)), 2) if observed else None,
        "stage_metrics": stage_metrics,
        "baseline_medians": baselines,
        "anomalies_count": len(anomalies), "anomalies": anomalies,
        "workload_summary": workload_summary,
        "pull_requests": pull_requests, "model": model, "metadata": metadata,
        "data_quality": {
            "timeline_records_complete": timeline_complete,
            "timeline_coverage_pct": round(100 * timeline_complete / len(pull_requests), 1) if pull_requests else 0.0,
            "confidence_interval_cohorts": ci_cohorts, "warnings": warnings,
            "anomaly_interpretation": "Triage signals for process investigation; shorter turnaround does not establish review quality.",
            "primary_outcome": "time to first human review (queue latency); open PRs without a review are right-censored at audit time",
            "reviewer_workload_proxy": "count of sampled human review events by the eventual first reviewer in the prior seven days; not a complete concurrent assignment count",
            "author_response_proxy": "first author issue-comment event after the first human review; does not measure all code-response activity",
            "stage_metrics_note": "request-to-first-review and approval-to-merge are conditional on those events being available; response time is a comment proxy",
            "complexity_definition": {"small": "<=100 changed lines and <=5 files", "medium": "<=1000 changed lines and <=20 files", "large": "above either medium threshold", "missing": "Unknown"},
        },
    }

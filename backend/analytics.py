"""Statistical and reviewer-workload calculations for RevAudit."""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime, timezone
from statistics import mean
from typing import Any, Dict, Iterable, List, Optional, Tuple

import pandas as pd
from sqlalchemy.orm import Session

from models import PullRequest, ReviewEvent


def parse_utc_dt(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def categorize_pr_size(body_len: int) -> str:
    if body_len < 250:
        return "Small"
    if body_len < 1000:
        return "Medium"
    return "Large"


def _as_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _is_open_at(pr: PullRequest, moment: datetime) -> bool:
    created_at = _as_utc(pr.created_at)
    closed_at = _as_utc(pr.closed_at)
    return bool(
        created_at
        and created_at <= moment
        and (closed_at is None or closed_at >= moment)
    )


def populate_reviewer_metrics(prs: Iterable[PullRequest]) -> None:
    """Attach first-review, review-round, and workload snapshots to PR rows.

    Workload is defined as the number of other repository PRs on which the
    same reviewer had already submitted a review and which were still open at
    the time of the current review. It is a transparent queue-congestion proxy,
    not a claim about formal GitHub assignments.
    """
    pr_list = list(prs)
    pr_by_id = {pr.id: pr for pr in pr_list}
    events = [
        event
        for pr in pr_list
        for event in pr.reviews
        if event.submitted_at is not None
    ]
    events.sort(key=lambda event: _as_utc(event.submitted_at) or datetime.min.replace(tzinfo=timezone.utc))

    by_reviewer: Dict[int, List[ReviewEvent]] = defaultdict(list)
    for event in events:
        if event.reviewer_id is not None:
            by_reviewer[event.reviewer_id].append(event)

    workload_by_event: Dict[int, int] = {}
    for reviewer_events in by_reviewer.values():
        for index, event in enumerate(reviewer_events):
            moment = _as_utc(event.submitted_at)
            if moment is None:
                continue
            active_reviewed_prs = set()
            for previous in reviewer_events[:index]:
                previous_pr = pr_by_id.get(previous.pr_id)
                if (
                    previous_pr
                    and previous_pr.id != event.pr_id
                    and _is_open_at(previous_pr, moment)
                ):
                    active_reviewed_prs.add(previous_pr.id)
            workload_by_event[event.id] = len(active_reviewed_prs)
            event.reviewer_workload = len(active_reviewed_prs)

    events_by_pr: Dict[int, List[ReviewEvent]] = defaultdict(list)
    for event in events:
        events_by_pr[event.pr_id].append(event)

    for pr in pr_list:
        pr_events = sorted(
            events_by_pr.get(pr.id, []),
            key=lambda event: _as_utc(event.submitted_at)
            or datetime.min.replace(tzinfo=timezone.utc),
        )
        pr.review_count = len(pr_events)
        pr.review_rounds = len(
            {
                _as_utc(event.submitted_at).date()
                for event in pr_events
                if event.submitted_at is not None
            }
        )
        first_event = pr_events[0] if pr_events else None
        if first_event is None:
            pr.first_review_at = None
            pr.time_to_first_review_hours = None
            pr.reviewer_login = None
            pr.reviewer_workload = 0
            continue

        pr.first_review_at = first_event.submitted_at
        created_at = _as_utc(pr.created_at)
        first_review_at = _as_utc(first_event.submitted_at)
        if created_at and first_review_at:
            pr.time_to_first_review_hours = round(
                max(0.0, (first_review_at - created_at).total_seconds() / 3600.0), 2
            )
        pr.reviewer_login = first_event.reviewer.login if first_event.reviewer else None
        pr.reviewer_workload = workload_by_event.get(first_event.id, 0)


def _correlation_and_slope(points: List[Tuple[float, float]]) -> Tuple[Optional[float], Optional[float]]:
    if len(points) < 2:
        return None, None
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    x_bar = mean(xs)
    y_bar = mean(ys)
    covariance = sum((x - x_bar) * (y - y_bar) for x, y in points)
    x_variance = sum((x - x_bar) ** 2 for x in xs)
    y_variance = sum((y - y_bar) ** 2 for y in ys)
    slope = covariance / x_variance if x_variance else None
    denominator = math.sqrt(x_variance * y_variance)
    correlation = covariance / denominator if denominator else None
    return correlation, slope


def workload_summary(merged_prs: List[PullRequest]) -> Dict[str, Any]:
    workload_values = [
        float(pr.reviewer_workload or 0)
        for pr in merged_prs
        if pr.first_review_at is not None
    ]
    latency_points = [
        (float(pr.reviewer_workload or 0), float(pr.time_to_first_review_hours))
        for pr in merged_prs
        if pr.time_to_first_review_hours is not None
    ]
    correlation, slope = _correlation_and_slope(latency_points)
    return {
        "average_concurrent_prs": round(mean(workload_values), 2)
        if workload_values
        else 0.0,
        "max_concurrent_prs": int(max(workload_values)) if workload_values else 0,
        "correlation_with_first_review_hours": round(correlation, 3)
        if correlation is not None
        else None,
        "slope_hours_per_concurrent_pr": round(slope, 3)
        if slope is not None
        else None,
        "sample_size": len(latency_points),
        "review_event_count": sum(int(pr.review_count or 0) for pr in merged_prs),
        "definition": (
            "Other PRs previously reviewed by the first reviewer that were "
            "still open when the first review was submitted."
        ),
    }


def analyze_pull_requests(all_repo_prs: List[PullRequest], db: Session) -> Dict[str, Any]:
    merged_prs = [
        pr
        for pr in all_repo_prs
        if pr.merged_at is not None and pr.review_time_hours is not None
    ]
    populate_reviewer_metrics(all_repo_prs)

    if not merged_prs:
        db.commit()
        return {
            "merged_prs": [],
            "baseline_medians": {},
            "anomalies": [],
            "workload_summary": workload_summary([]),
        }

    records = []
    for pr in merged_prs:
        records.append(
            {
                "id": pr.id,
                "number": pr.pr_number,
                "title": pr.title,
                "author": pr.author.login if pr.author else "unknown",
                "body_length": pr.body_length or 0,
                "size_category": pr.size_category,
                "review_time_hours": pr.review_time_hours,
                "html_url": pr.html_url or "",
                "created_at": pr.created_at.isoformat() if pr.created_at else "",
                "merged_at": pr.merged_at.isoformat() if pr.merged_at else "",
                "first_review_at": pr.first_review_at.isoformat()
                if pr.first_review_at
                else None,
                "time_to_first_review_hours": pr.time_to_first_review_hours,
                "reviewer_login": pr.reviewer_login,
                "reviewer_workload": pr.reviewer_workload or 0,
                "review_count": pr.review_count or 0,
                "review_rounds": pr.review_rounds or 0,
            }
        )

    df = pd.DataFrame(records)
    group_stats = (
        df.groupby("size_category")["review_time_hours"]
        .agg(["median", "count", "std"])
        .reset_index()
    )

    baseline_medians: Dict[str, Dict[str, Any]] = {}
    median_lookup: Dict[str, float] = {}
    for _, row in group_stats.iterrows():
        category = str(row["size_category"])
        median_value = float(row["median"])
        count = int(row["count"])
        standard_deviation = float(row["std"]) if pd.notna(row["std"]) else 0.0
        margin = (
            1.645 * (standard_deviation / math.sqrt(count))
            if count > 1 and standard_deviation > 0
            else median_value * 0.15
        )
        baseline_medians[category] = {
            "median_hours": round(median_value, 2),
            "sample_size": count,
            "mock_ci_90": [
                max(0.0, round(median_value - margin, 2)),
                round(median_value + margin, 2),
            ],
        }
        median_lookup[category] = median_value

    anomalies: List[Dict[str, Any]] = []
    pr_by_id = {pr.id: pr for pr in merged_prs}
    for record in records:
        median_value = median_lookup[record["size_category"]]
        threshold = 1.5 * median_value
        review_hours = float(record["review_time_hours"])
        is_anomaly = review_hours > threshold
        ratio = round(review_hours / max(median_value, 0.01), 2)
        db_pr = pr_by_id[record["id"]]
        db_pr.is_anomaly = is_anomaly
        db_pr.anomaly_ratio = ratio
        record.update(
            {
                "turnaround_hours": review_hours,
                "group_median_hours": round(median_value, 2),
                "is_anomaly": is_anomaly,
                "anomaly_ratio": ratio,
            }
        )
        if is_anomaly:
            anomalies.append(
                {
                    **{key: value for key, value in record.items() if key != "id"},
                    "group_median_hours": round(median_value, 2),
                    "anomaly_ratio": ratio,
                    "threshold_hours": round(threshold, 2),
                    "mock_ci_90": baseline_medians[record["size_category"]][
                        "mock_ci_90"
                    ],
                }
            )

    db.commit()
    anomalies.sort(key=lambda item: item["anomaly_ratio"], reverse=True)
    return {
        "merged_prs": records,
        "baseline_medians": baseline_medians,
        "anomalies": anomalies,
        "workload_summary": workload_summary(merged_prs),
    }

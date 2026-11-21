"""PDF report generation for completed audits."""

from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, List, Sequence


def _format_number(value: Any, digits: int = 2) -> str:
    if value is None:
        return "—"
    try:
        return f"{float(value):.{digits}f}"
    except (TypeError, ValueError):
        return "—"


def _format_interval(interval: Any) -> str:
    if not isinstance(interval, (list, tuple)) or len(interval) != 2:
        return "—"
    return f"[{_format_number(interval[0])}, {_format_number(interval[1])}]"


def _table_style(colors, header: bool = True):
    from reportlab.platypus import TableStyle

    commands = [
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]
    if header:
        commands.extend(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#172033")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]
        )
    return TableStyle(commands)


def _table(rows: Sequence[Sequence[Any]], widths: Sequence[float], colors, header: bool = True):
    from reportlab.platypus import Table

    table = Table([list(row) for row in rows], colWidths=list(widths))
    table.setStyle(_table_style(colors, header=header))
    return table


def build_audit_pdf(payload: Dict[str, Any]) -> bytes:
    """Render a compact, self-contained PDF from an audit response."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    except ImportError as exc:  # pragma: no cover - installed by production requirements
        raise RuntimeError(
            "PDF export requires reportlab; install backend/requirements.txt."
        ) from exc

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
        title=f"RevAudit {payload.get('owner', '')}/{payload.get('repo', '')}",
    )
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="RevAuditTitle",
            parent=styles["Title"],
            alignment=TA_CENTER,
            textColor=colors.HexColor("#172033"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="RevAuditSmall",
            parent=styles["BodyText"],
            fontSize=8,
            leading=10,
        )
    )

    owner = payload.get("owner", "unknown")
    repo = payload.get("repo", "unknown")
    metadata = payload.get("metadata") or {}
    workload = payload.get("workload_summary") or {}
    engine = payload.get("workload_engine") or {}
    baselines = payload.get("baseline_medians") or {}
    anomalies = payload.get("anomalies") or []
    workload_anomalies = payload.get("workload_anomalies") or []

    story: List[Any] = [
        Paragraph("RevAudit Review Effort Report", styles["RevAuditTitle"]),
        Paragraph(f"Repository: <b>{owner}/{repo}</b>", styles["BodyText"]),
    ]
    if metadata.get("as_of"):
        story.append(
            Paragraph(
                f"As of {metadata.get('as_of')} · analysis version "
                f"{metadata.get('analysis_version', 'unknown')}",
                styles["RevAuditSmall"],
            )
        )
    story.append(Spacer(1, 10))

    summary_rows = [
        ["PRs sampled", str(payload.get("total_prs_in_sample", 0)), "Merged PRs", str(payload.get("merged_prs_count", 0))],
        ["First reviews", str(payload.get("first_review_observed_count", 0)), "Censored", str(payload.get("first_review_censored_count", 0))],
        ["Median first review", _format_number(payload.get("observed_median_first_review_hours")) + " h", "Robust triage signals", str(payload.get("anomalies_count", len(anomalies)))],
        ["Workload-flagged", str(engine.get("flagged_count", len(workload_anomalies))), "Avg queue at creation", _format_number(engine.get("average_queue_at_creation"))],
    ]
    summary = _table(
        summary_rows,
        [1.45 * inch, 1.05 * inch, 1.55 * inch, 1.05 * inch],
        colors,
        header=False,
    )
    story.extend([summary, Spacer(1, 12)])

    story.append(Paragraph("Size-Controlled Baselines", styles["Heading2"]))
    baseline_rows: List[List[Any]] = [
        ["Cohort", "Sample", "Events", "Censored", "Median (h)", "95% CI (h)", "Status"]
    ]
    for category in ("Small", "Medium", "Large", "Unknown"):
        baseline = baselines.get(category)
        if not baseline:
            continue
        interval = baseline.get("confidence_interval_95") or baseline.get("mock_ci_90")
        baseline_rows.append(
            [
                category,
                str(baseline.get("sample_size", 0)),
                str(baseline.get("event_count", "—")),
                str(baseline.get("censored_count", "—")),
                _format_number(baseline.get("median_hours")),
                _format_interval(interval),
                str(baseline.get("estimate_status") or "estimated").replace("_", " "),
            ]
        )
    story.extend(
        [
            _table(
                baseline_rows,
                [0.85 * inch, 0.7 * inch, 0.7 * inch, 0.8 * inch, 0.9 * inch, 1.2 * inch, 1.4 * inch],
                colors,
            ),
            Spacer(1, 12),
        ]
    )

    story.append(Paragraph("Robust Adjusted Triage Signals", styles["Heading2"]))
    anomaly_rows: List[List[Any]] = [
        ["PR", "Author", "Cohort", "Latency (h)", "Expected (h)", "Robust z", "Direction"]
    ]
    for anomaly in anomalies:
        latency = anomaly.get("review_time_hours", anomaly.get("first_review_latency_hours"))
        anomaly_rows.append(
            [
                f"#{anomaly.get('pr_number', '')}",
                str(anomaly.get("author", "unknown"))[:20],
                str(anomaly.get("size_category", "")),
                _format_number(latency),
                _format_number(anomaly.get("expected_first_review_hours")),
                _format_number(anomaly.get("standardized_residual")),
                str(anomaly.get("anomaly_direction") or "—").replace("_", " "),
            ]
        )
    if len(anomaly_rows) == 1:
        anomaly_rows.append(["—", "No robust triage signals", "—", "—", "—", "—", "—"])
    story.extend(
        [
            _table(
                anomaly_rows,
                [0.8 * inch, 1.35 * inch, 0.8 * inch, 0.85 * inch, 0.9 * inch, 0.75 * inch, 1.4 * inch],
                colors,
            ),
            Spacer(1, 12),
        ]
    )

    story.append(Paragraph("Workload-Adjusted Threshold Matrix", styles["Heading2"]))
    workload_rows: List[List[Any]] = [
        ["PR", "First reviewer", "Queue", "Multiplier", "Threshold (h)", "Latency (h)", "× Median"]
    ]
    for row in workload_anomalies:
        workload_rows.append(
            [
                f"#{row.get('pr_number', '')}",
                str(row.get("first_reviewer") or "—")[:20],
                str(row.get("reviewer_queue_at_creation", 0)),
                f"{_format_number(row.get('dynamic_threshold_ratio'), 2)}×",
                _format_number(row.get("dynamic_threshold_hours")),
                _format_number(row.get("first_review_latency_hours")),
                f"{_format_number(row.get('workload_ratio_to_median'), 2)}×",
            ]
        )
    if len(workload_rows) == 1:
        workload_rows.append(["—", "No workload-adjusted signals", "—", "—", "—", "—", "—"])
    story.extend(
        [
            _table(
                workload_rows,
                [0.8 * inch, 1.4 * inch, 0.55 * inch, 0.8 * inch, 0.95 * inch, 0.9 * inch, 0.8 * inch],
                colors,
            ),
            Spacer(1, 8),
            Paragraph(
                "Rule: Dynamic_Threshold = 1.5 + (0.15 × active PRs in the reviewer's "
                "queue at PR ready time). Reported alongside the robust residual model, "
                "not as a replacement. Queue coverage: "
                f"{_format_number(engine.get('request_coverage_pct'), 1)}% of evaluated PRs.",
                styles["RevAuditSmall"],
            ),
            Spacer(1, 10),
        ]
    )

    story.append(Paragraph("Reviewer Workload Snapshot", styles["Heading2"]))
    story.append(
        Paragraph(
            "Average concurrent queue proxy: "
            f"{_format_number(workload.get('average_concurrent_prs'))} · "
            f"Maximum: {workload.get('max_concurrent_prs', 0)} · "
            f"Sample: {workload.get('sample_size', 0)} · "
            f"Review events: {workload.get('review_event_count', 0)}",
            styles["RevAuditSmall"],
        )
    )
    story.extend([Spacer(1, 8), Paragraph(str(workload.get("definition") or ""), styles["RevAuditSmall"])])
    story.extend(
        [
            Spacer(1, 12),
            Paragraph(
                "Interpretation: anomaly and workload flags are process triage signals for "
                "investigation, not judgments of review quality or individual performance.",
                styles["RevAuditSmall"],
            ),
        ]
    )
    document.build(story)
    return buffer.getvalue()

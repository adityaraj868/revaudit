"""PDF report generation for completed audits."""

from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, List


def build_audit_pdf(payload: Dict[str, Any]) -> bytes:
    """Render a compact, self-contained PDF from an audit response."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
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
    workload = payload.get("workload_summary") or {}
    story: List[Any] = [
        Paragraph(f"RevAudit Review Effort Report", styles["RevAuditTitle"]),
        Paragraph(f"Repository: <b>{owner}/{repo}</b>", styles["BodyText"]),
        Spacer(1, 10),
    ]

    summary_rows = [
        ["Closed PRs", str(payload.get("total_closed_prs", 0)), "Merged PRs", str(payload.get("merged_prs_count", 0))],
        ["Unmerged excluded", str(payload.get("unmerged_prs_dropped", 0)), "Anomalies", str(payload.get("anomalies_count", 0))],
        ["Avg. reviewer workload", str(workload.get("average_concurrent_prs", 0)), "Max workload", str(workload.get("max_concurrent_prs", 0))],
        ["Workload sample", str(workload.get("sample_size", 0)), "Review events", str(workload.get("review_event_count", 0))],
    ]
    summary = Table(summary_rows, colWidths=[1.45 * inch, 1.05 * inch, 1.55 * inch, 1.05 * inch])
    summary.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f4f7fb")),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend([summary, Spacer(1, 14)])

    story.append(Paragraph("Size-Controlled Baselines", styles["Heading2"]))
    baseline_rows = [["Cohort", "Sample", "Median (h)", "90% CI", "Threshold (h)"]]
    for category in ("Small", "Medium", "Large"):
        baseline = (payload.get("baseline_medians") or {}).get(category)
        if not baseline:
            continue
        ci = baseline.get("mock_ci_90", [0, 0])
        median = float(baseline.get("median_hours", 0))
        baseline_rows.append(
            [
                category,
                str(baseline.get("sample_size", 0)),
                f"{median:.2f}",
                f"[{float(ci[0]):.2f}, {float(ci[1]):.2f}]",
                f"> {median * 1.5:.2f}",
            ]
        )
    baseline_table = Table(baseline_rows, colWidths=[1.1 * inch, 0.8 * inch, 1.1 * inch, 1.2 * inch, 1.2 * inch])
    baseline_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#172033")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.extend([baseline_table, Spacer(1, 14)])

    story.append(Paragraph("Flagged Anomalies", styles["Heading2"]))
    anomaly_rows = [["PR", "Author", "Size", "Review (h)", "Ratio", "Workload"]]
    for anomaly in payload.get("anomalies") or []:
        anomaly_rows.append(
            [
                f"#{anomaly.get('pr_number', '')}",
                str(anomaly.get("author", "unknown"))[:22],
                str(anomaly.get("size_category", "")),
                f"{float(anomaly.get('review_time_hours', 0)):.2f}",
                f"{float(anomaly.get('anomaly_ratio', 0)):.2f}x",
                str(anomaly.get("reviewer_workload", 0)),
            ]
        )
    if len(anomaly_rows) == 1:
        anomaly_rows.append(["—", "No anomalies", "—", "—", "—", "—"])
    anomaly_table = Table(anomaly_rows, colWidths=[0.55 * inch, 1.65 * inch, 0.8 * inch, 1.0 * inch, 0.75 * inch, 0.8 * inch])
    anomaly_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#172033")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(anomaly_table)
    story.extend(
        [
            Spacer(1, 12),
            Paragraph(
                "Workload definition: number of other repository PRs previously reviewed by the first reviewer that were still open at the time of the first review.",
                styles["RevAuditSmall"],
            ),
        ]
    )
    document.build(story)
    return buffer.getvalue()

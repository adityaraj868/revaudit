from datetime import datetime
from typing import Any, Dict, List, Optional
import math
import requests
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="RevAudit Engine",
    description="Analyzes GitHub PR review effort controlling for PR size and reviewer workload.",
    version="1.0.0",
)

# Enable CORS for frontend integration (Vite dev server, local files, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def categorize_pr_size(body_len: int) -> str:
    """Categorize PR size based on the character length of the PR description."""
    if body_len < 250:
        return "Small"
    elif body_len < 1000:
        return "Medium"
    else:
        return "Large"


@app.get("/")
def root():
    return {
        "service": "RevAudit API",
        "status": "active",
        "docs": "/docs",
        "audit_endpoint": "/api/audit?owner={owner}&repo={repo}",
    }


@app.get("/api/audit")
def audit_repository(
    owner: str = Query(..., description="GitHub repository owner/organization"),
    repo: str = Query(..., description="GitHub repository name"),
):
    print(f"[{datetime.now().isoformat()}] Received audit request for {owner}/{repo}", flush=True)
    """
    Analyzes review effort for closed pull requests in a GitHub repository:
    1. Fetches the 30 most recently closed PRs.
    2. Filters out unmerged PRs.
    3. Calculates review effort (duration in hours from created_at to merged_at).
    4. Categorizes PRs by size proxy (body character length).
    5. Calculates median review times per size bucket.
    6. Flags anomalies that exceed 1.5x of the group median with a mock 90% confidence interval.
    """
    github_url = f"https://api.github.com/repos/{owner}/{repo}/pulls"
    params = {"state": "closed", "per_page": 30}
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "RevAudit-Academic-Prototype",
    }

    try:
        response = requests.get(github_url, params=params, headers=headers, timeout=15)
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Network error connecting to GitHub API: {str(e)}",
        )

    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail=f"Repository '{owner}/{repo}' not found on GitHub. Please check owner and repository spelling.",
        )
    elif response.status_code == 403:
        raise HTTPException(
            status_code=403,
            detail="GitHub API rate limit exceeded. Please try again later or supply an authorization token.",
        )
    elif response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"GitHub API returned error: {response.text}",
        )

    prs_data = response.json()
    if not isinstance(prs_data, list) or len(prs_data) == 0:
        return {
            "owner": owner,
            "repo": repo,
            "total_closed_prs": 0,
            "merged_prs_count": 0,
            "baseline_medians": {},
            "anomalies": [],
            "message": "No closed pull requests found for this repository.",
        }

    # Step 3: Convert JSON to Pandas DataFrame
    df = pd.DataFrame(prs_data)

    # Step 4: Data cleaning - drop PRs that were closed but never merged (missing data imputation)
    # Merged PRs have a non-null 'merged_at' timestamp
    if "merged_at" not in df.columns:
        return {
            "owner": owner,
            "repo": repo,
            "total_closed_prs": len(df),
            "merged_prs_count": 0,
            "baseline_medians": {},
            "anomalies": [],
            "message": "No merged pull requests found in the recent closed PR history.",
        }

    merged_df = df[df["merged_at"].notna()].copy()

    if merged_df.empty:
        return {
            "owner": owner,
            "repo": repo,
            "total_closed_prs": len(df),
            "merged_prs_count": 0,
            "baseline_medians": {},
            "anomalies": [],
            "message": "All fetched closed PRs were closed without merging.",
        }

    # Step 5: Calculate review effort (hours between created_at and merged_at)
    merged_df["created_dt"] = pd.to_datetime(merged_df["created_at"])
    merged_df["merged_dt"] = pd.to_datetime(merged_df["merged_at"])
    merged_df["review_time_hours"] = (
        merged_df["merged_dt"] - merged_df["created_dt"]
    ).dt.total_seconds() / 3600.0

    # Round review_time_hours for clean reporting
    merged_df["review_time_hours"] = merged_df["review_time_hours"].round(2)

    # Step 6: PR Size proxy using body character length
    merged_df["body_length"] = merged_df["body"].fillna("").astype(str).str.len()
    merged_df["size_category"] = merged_df["body_length"].apply(categorize_pr_size)

    # Extract author username safely
    merged_df["author"] = merged_df["user"].apply(
        lambda u: u.get("login", "unknown") if isinstance(u, dict) else "unknown"
    )

    # Step 7: Calculate median review time for each group
    group_stats = (
        merged_df.groupby("size_category")["review_time_hours"]
        .agg(["median", "count", "std"])
        .reset_index()
    )

    # Build baseline medians dictionary with mock 90% confidence intervals
    baseline_medians: Dict[str, Dict[str, Any]] = {}
    median_lookup: Dict[str, float] = {}

    for _, row in group_stats.iterrows():
        cat = str(row["size_category"])
        med = float(row["median"]) if pd.notna(row["median"]) else 0.0
        cnt = int(row["count"])
        std = float(row["std"]) if pd.notna(row["std"]) else 0.0

        # Mock 90% Confidence Interval around the group baseline
        # Formula: median +/- 1.645 * (std / sqrt(n)) when std > 0, else +/- 15% range
        if cnt > 1 and std > 0:
            margin = 1.645 * (std / math.sqrt(cnt))
        else:
            margin = med * 0.15

        ci_lower = max(0.0, round(med - margin, 2))
        ci_upper = round(med + margin, 2)

        baseline_medians[cat] = {
            "median_hours": round(med, 2),
            "sample_size": cnt,
            "mock_ci_90": [ci_lower, ci_upper],
        }
        median_lookup[cat] = med

    # Flag anomalies: review_time > 1.5 * group median
    anomalies: List[Dict[str, Any]] = []

    for _, pr in merged_df.iterrows():
        cat = pr["size_category"]
        med = median_lookup.get(cat, 0.0)
        review_hours = float(pr["review_time_hours"])
        threshold = 1.5 * med

        if review_hours > threshold:
            ci_data = baseline_medians.get(cat, {}).get("mock_ci_90", [0.0, 0.0])
            anomalies.append({
                "pr_number": int(pr["number"]),
                "title": str(pr.get("title", f"PR #{pr['number']}")),
                "author": str(pr["author"]),
                "size_category": cat,
                "body_length": int(pr["body_length"]),
                "review_time_hours": review_hours,
                "group_median_hours": round(med, 2),
                "anomaly_ratio": round(review_hours / max(med, 0.01), 2),
                "threshold_hours": round(threshold, 2),
                "mock_ci_90": ci_data,
                "html_url": str(pr.get("html_url", "")),
                "created_at": str(pr["created_at"]),
                "merged_at": str(pr["merged_at"]),
            })

    # Sort anomalies by anomaly ratio descending
    anomalies.sort(key=lambda x: x["anomaly_ratio"], reverse=True)

    # Step 8: Return structured JSON payload
    return {
        "owner": owner,
        "repo": repo,
        "total_closed_prs": len(df),
        "merged_prs_count": len(merged_df),
        "unmerged_prs_dropped": len(df) - len(merged_df),
        "baseline_medians": baseline_medians,
        "anomalies_count": len(anomalies),
        "anomalies": anomalies,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

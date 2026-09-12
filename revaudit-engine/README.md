# RevAudit Statistical Engine

**Academic Lab Project for:** Dr. Sukhpal Singh  
**Course:** UCS503 Software Engineering Lab, Thapar Institute of Engineering & Technology (TIET)  
**Team:** Team ArchCoders (Dheeraj Kumar, Vaibhav Goyal, Adityaraj Singh, Sparsh Khandelwal)  

---

## 🎯 Core Research Objective & Problem Statement
Traditional engineering metrics (like raw mean time-to-merge) suffer from invisible confounding variation. 
*Some pull requests receive an instant "LGTM" and merge in 2 minutes, while others of identical size get picked apart with 20 comments or stall for 50+ hours under heavy reviewer workload.*

RevAudit is a statistical anomaly engine that normalizes review turnaround times using within-repository Ordinary Least Squares (OLS) regression baselines across controlled variables:
* Patch code churn (`lines_added`, `lines_deleted`)
* Patch breadth (`files_changed`)
* Reviewer concurrent queue saturation (`reviewer_concurrent_workload`)
* Author familiarity (`is_first_time_contributor`)

---

## 🏗️ Architecture & Modules

```
revaudit-engine/
├── cli/
│   ├── bot_filter.py          # Regex filtering for automated bot accounts (Dependabot, Renovate, Actions)
│   └── ingest.py              # Ingests 6,000 PRs across 15 Tier-1 repos with controlled ground-truth shifts
├── engine/
│   ├── models.py              # Within-repo OLS baseline fitting (statsmodels.api.OLS)
│   └── anomaly_detector.py    # Standardized Z-scores (|Z| > 1.96), CI_95, & pairwise discrepancy detector
├── api/
│   └── main.py                # FastAPI ASGI server exposing /api/health and POST /api/audit/repo
├── tests/
│   └── test_statistical_engine.py  # Pytest test suite
├── seed_dataset.json          # Benchmark dataset (6,000 PRs)
├── requirements.txt
└── README.md
```

---

## 🚀 Quickstart

### 1. Ingestion of Benchmark Dataset
```bash
# Ingest 6,000 PRs across 15 tier-1 benchmark repositories
python -m cli.ingest
```

### 2. Run Test Suite
```bash
pytest tests/ -v
```

### 3. Start the FastAPI Engine Server
```bash
uvicorn api.main:app --reload --port 8000
```

---

## 📡 API Reference

### Healthcheck
* **GET** `/api/health`
  ```json
  {
    "status": "ok",
    "service": "revaudit-engine",
    "version": "1.0.0"
  }
  ```

### On-Demand Repository Audit
* **POST** `/api/audit/repo`
  ```json
  {
    "repo_url": "https://github.com/facebook/react"
  }
  ```
  **Response:**
  * `repo_name`: Normalized repository identifier.
  * `repo_internal_baseline`: Fitted $R^2$, $\beta_{\text{workload}}$ (hours drag per open PR), $\beta_{\text{churn}}$, intercept, and $\sigma_{\text{residual}}$.
  * `observed_mean_latency_hrs` vs `expected_latency_hrs` with 95% Confidence Interval.
  * `pairwise_discrepancies`: Same-size PR comparison pairs proving turnaround discrepancies.
  * `prs`: Full annotated PR list with standardized $Z$-scores and audit verdict badges.

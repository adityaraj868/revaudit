# RevAudit: Empirical Pull Request Code Review Effort Anomaly Detection System

**Academic Lab Project Report & Software Design Document**  
**Submitted to:** Dr. Sukhpal Singh  
**Course:** Software Engineering Laboratory  
**Organization:** Team ArchCoders  
**Team Members:**
* **Sparsh Khandelwal** — Backend & Statistical Math Engine Lead
* **Dheeraj** — System Architecture & UML Modeling Lead
* **Frontend Teammate** — UI/UX & Dashboard Integration Lead
* **QA & Validation Teammate** — Verification, Edge Cases & Presentation Lead

**Date:** September 2026  
**Repository:** `/Users/sparshkhandelwal/Desktop/RevAudit`

---

## Executive Summary & Abstract

Code review turnaround time is one of the most widely referenced engineering velocity metrics in modern collaborative software development. However, flat metrics like arithmetic mean "time-to-merge" fail empirically because they do not control for confounding variables—chiefly pull request (PR) complexity and reviewer workload. This creates perverse incentives where reviewers are rewarded for trivial, uncritical approvals ("LGTM") and penalized for thorough investigations of large, high-risk code modifications.

**RevAudit** is an academic prototype engineered to solve this "Invisible Variation" problem. Built within a strict 4-hour rapid prototyping window, RevAudit connects directly to GitHub's public REST API v3 to ingest live pull request histories. It imputes missing data by discarding unmerged PRs, stratifies PRs into complexity cohorts using body length proxies, computes non-parametric median review latencies with 90% confidence intervals, and flags statistically significant review effort anomalies (> 1.5× group median). The accompanying web application serves dual purposes: an interactive slide deck for academic evaluation and an operational audit dashboard.

---

## 1. Problem Statement & Motivation

### 1.1 The Flaw in Flat "Time-to-Merge" Metrics
In contemporary agile engineering, teams often set service level objectives (SLOs) for pull request resolution (e.g., "PRs must be reviewed within 24 hours"). This naive approach suffers from three critical flaws:
1. **Uncontrolled Confounders:** A 10-line documentation patch taking 48 hours indicates severe communication friction or queue stagnation. Conversely, a 2,000-line database migration taking 48 hours represents rapid turnaround. Flat metrics equate these scenarios.
2. **Perverse Incentives:** When engineers are evaluated on raw turnaround times, they prioritize small, easy PRs and postpone large, complex PRs, exacerbating code review bottlenecks where they are most dangerous.
3. **Queue Time vs. Review Time Conflation:** In software engineering, total latency consists of *queue latency* (waiting for a reviewer to open the PR) and *active review latency* (reading code, leaving comments, iterating). High reviewer workloads cause queue latency spikes that are misattributed to individual PR inertia.

### 1.2 The "Invisible Variation" Hypothesis
Pull request turnaround in empirical software engineering exhibits high variance governed by heavy-tailed, right-skewed distributions (log-normal or Pareto). Standard parametric statistics (such as the arithmetic mean and sample variance) are distorted by extreme outliers. To provide fair, actionable signals, review metrics must be:
* **Stratified** by PR complexity cohorts.
* **Evaluated non-parametrically** using medians.
* **Quantified with uncertainty bounds** (confidence intervals).

---

## 2. Statistical & Mathematical Methodology

The statistical engine in RevAudit executes a five-stage analytical pipeline:

```
[Raw GitHub PRs] ──> [Imputation / Cleaning] ──> [Size Stratification] ──> [Median & CI90] ──> [1.5x Anomaly Flagging]
```

### 2.1 Survival Bias Correction (Imputation)
Pull requests that are closed without being merged represent rejected proposals, duplicate work, or abandoned experiments. Incorporating their turnaround times distorts true code integration latency. The engine filters out non-merged pull requests:
$$\mathcal{D}_{\text{merged}} = \{ \text{PR}_i \in \mathcal{D}_{\text{raw}} \mid \text{merged\_at}_i \neq \text{null} \}$$

### 2.2 Review Effort Latency Calculation
For every merged PR, the total review duration in hours $\Delta t_i$ is computed:
$$\Delta t_i = \frac{\text{Timestamp}(\text{merged\_at}_i) - \text{Timestamp}(\text{created\_at}_i)}{3600\text{ seconds}}$$

### 2.3 PR Complexity Stratification (Proxy Heuristic)
Because summary REST API responses do not expose detailed line additions and deletions without secondary per-PR queries, RevAudit uses description character length ($L_{\text{body}}$) as an immediate proxy for architectural complexity:
$$\text{Cohort}(\text{PR}_i) = \begin{cases} 
\text{Small} & \text{if } L_{\text{body}} < 250\text{ chars} \\
\text{Medium} & \text{if } 250 \le L_{\text{body}} < 1000\text{ chars} \\
\text{Large} & \text{if } L_{\text{body}} \ge 1000\text{ chars}
\end{cases}$$

### 2.4 Non-Parametric Central Tendency
For each cohort $C \in \{\text{Small}, \text{Medium}, \text{Large}\}$, the baseline turnaround is established using the median ($\tilde{x}_C$):
$$\tilde{x}_C = \text{Median}\left(\{ \Delta t_i \mid \text{PR}_i \in C \}\right)$$
The median is chosen because it has a breakdown point of 50%, guaranteeing robustness against extreme outliers.

### 2.5 90% Confidence Interval Estimation
To capture sampling uncertainty while controlling for cohort sample size ($n_C$) and cohort standard deviation ($s_C$), a 90% confidence interval ($CI_{90}$) is derived using the standard error of the median:
$$CI_{90}(C) = \left[ \max\left(0,\; \tilde{x}_C - 1.645 \cdot \frac{s_C}{\sqrt{n_C}}\right),\; \tilde{x}_C + 1.645 \cdot \frac{s_C}{\sqrt{n_C}} \right]$$

### 2.6 The 1.5× Anomaly Multiplier Heuristic
An individual pull request $\text{PR}_i$ belonging to cohort $C$ is flagged as an anomaly if its review duration exceeds 1.5 times the median of its cohort:
$$\text{IsAnomaly}(\text{PR}_i) = \begin{cases} 
\text{True} & \text{if } \Delta t_i > 1.5 \times \tilde{x}_C \\
\text{False} & \text{otherwise}
\end{cases}$$
The **Variance Ratio** $\mathcal{R}_i$ is computed to quantify the magnitude of deviation:
$$\mathcal{R}_i = \frac{\Delta t_i}{\tilde{x}_C}$$

---

## 3. System Architecture & Technical Specifications

```
┌────────────────────────────────────────────────────────┐
│                   React + Tailwind UI                  │
│       [ Presentation View ]   [ Live Demo View ]       │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP GET /api/audit
                            ▼
┌────────────────────────────────────────────────────────┐
│               FastAPI Server (:8000)                   │
│      (CORS Enabled, Error Handling, JSON Routing)      │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
              ▼                           ▼
  ┌───────────────────────┐   ┌───────────────────────┐
  │   Requests Client     │   │     Pandas Engine     │
  │  GitHub REST API v3   │   │  (Cleaning, Medians,  │
  │   (/repos/.../pulls)  │   │      CI, Anomaly)     │
  └───────────────────────┘   └───────────────────────┘
```

### 3.1 Tech Stack Justification
* **Python & FastAPI:** Chosen for rapid development, native async performance, automatic OpenAPI documentation, and effortless integration with scientific data processing packages.
* **Pandas:** Provides vectorized operations on series and data frames, enabling rapid quantile/median aggregation and missing-data imputation without procedural loop overhead.
* **React & Tailwind CSS:** Single-page reactive interface providing instant state synchronization, accessible styling, and modular component reusability.
* **PlantUML:** Standardized, version-controllable text-to-UML modeling syntax for architecture specifications.

---

## 4. UML Architectural Modeling Suite

### 4.1 Sequence Diagram: Contributor Login via GitHub OAuth
*File: `docs/diagrams/01_sequence_oauth.puml`*
Models user authentication, token delegation from GitHub's OAuth server, JWT generation by FastAPI, and secure profile persistence on the frontend.

### 4.2 Sequence Diagram: Frontend Requesting Repo Audit
*File: `docs/diagrams/02_sequence_audit_request.puml`*
Illustrates the user flow: entering repository coordinates (`owner/repo`), optimistic UI loading updates, FastAPI query dispatch, statistical computation handoff, and dynamic rendering of baseline metrics and anomaly tables.

### 4.3 Sequence Diagram: Backend GitHub API Fetch & Pagination
*File: `docs/diagrams/03_sequence_github_fetch.puml`*
Details the HTTP interaction between FastAPI and GitHub's REST endpoint (`/pulls?state=closed`), including header inspection, Link-header pagination loops, rate-limit check (403), and missing repo handling (404).

### 4.4 Sequence Diagram: Pandas Baseline Calculation & Anomaly Engine
*File: `docs/diagrams/04_sequence_pandas_baseline.puml`*
Traces the internal data lifecycle: JSON ingestion $\to$ DataFrame conversion $\to$ unmerged PR dropping $\to$ review latency subtraction $\to$ complexity grouping $\to$ median aggregation $\to$ 1.5× threshold comparison $\to$ output serialization.

### 4.5 Sequence Diagram: PDF Export Pipeline
*File: `docs/diagrams/05_sequence_pdf_export.puml`*
Documents the future-scope reporting subsystem: client serialization of audit parameters, backend PDF compilation using ReportLab, and binary stream download to the client.

### 4.6 Domain Class Diagram
*File: `docs/diagrams/06_class_diagram.puml`*
Specifies the primary domain model entities:
* `User`: Attributes (`id`, `github_id`, `username`, `role`), methods (`get_assigned_prs()`, `get_review_history()`).
* `Repository`: Attributes (`id`, `owner`, `name`, `last_audited_at`), methods (`fetch_closed_prs()`, `compute_repo_health()`).
* `PullRequest`: Attributes (`number`, `body_length`, `review_time_hours`, `size_category`, `is_anomaly`), methods (`calculate_review_time()`, `categorize_size()`).
* `ReviewEvent`: Attributes (`id`, `reviewer_id`, `state`, `time_to_review_hours`), methods (`is_approving()`).
* `StatisticalModel`: Attributes (`anomaly_multiplier`, `confidence_level`, `baseline_medians`), methods (`compute_size_baselines()`, `calculate_confidence_interval()`, `flag_anomalies()`).

---

## 5. Empirical Results & Case Study

### 5.1 Verification on `fastapi/fastapi`
The live prototype was executed against the official repository of the FastAPI framework.

#### Summary Metrics:
* **Total Closed PRs Ingested:** 30
* **Merged PRs Analyzed:** 9
* **Unmerged PRs Dropped (Imputation):** 21
* **Detected Anomalies:** 1

#### Size Cohort Baselines:
* **Small Cohort (< 250 chars):**
  * Sample Size: 3 PRs
  * Median Review Time: **0.39 hours (~23.4 minutes)**
  * 90% Confidence Interval: $[0.00\text{h},\; 2.15\text{h}]$
  * Anomaly Threshold ($1.5\times$): $> 0.58\text{ hours}$
* **Large Cohort (> 1000 chars):**
  * Sample Size: 6 PRs
  * Median Review Time: **8.04 hours**
  * 90% Confidence Interval: $[7.56\text{h},\; 8.51\text{h}]$
  * Anomaly Threshold ($1.5\times$): $> 12.06\text{ hours}$

#### Anomaly Analysis:
* **Pull Request:** #16282 (`👥 Update FastAPI People - Sponsors`)
* **Author:** `@pr-submit[bot]`
* **Character Length:** 34 characters ($\implies$ **Small** cohort)
* **Actual Review Duration:** **3.55 hours**
* **Variance Ratio:** **9.1× cohort median**
* **Finding:** While 3.55 hours is low compared to large refactorings (8h), it is severely anomalous for an automated 34-character sponsor list refresh in a repository where small PRs are merged within 23 minutes. This proves the validity of the size-controlled hypothesis.

---

## 6. Team Contributions Matrix

| Member | Assigned Domain | Deliverables & Responsibilities |
| :--- | :--- | :--- |
| **Sparsh Khandelwal** | Backend & Statistical Engine | • Architecture of FastAPI application (`backend/main.py`)<br>• Pandas data processing & imputation pipeline<br>• GitHub REST API integration & error handling<br>• Median baseline, 90% CI, and anomaly multiplier algorithms<br>• Cross-Origin Resource Sharing (CORS) configuration |
| **Dheeraj** | UML Modeling & System Architecture | • Authored 5 sequence diagrams in PlantUML<br>• Authored the complete domain Class Diagram<br>• Structural system design & entity relationship modeling<br>• Architectural documentation |
| **Frontend Teammate** | UI/UX & Web Integration | • React + Tailwind CSS dashboard (`frontend/src/App.jsx`)<br>• Dual-view navigation (Presentation Deck vs. Live Demo)<br>• Responsive KPI cards & flagged anomalies matrix<br>• Interactive PlantUML source code inspectors |
| **QA Teammate** | Verification & Validation | • Live endpoint verification against live repositories<br>• Error state testing (404 repo not found, 403 rate limits)<br>• Presentation rehearsal & academic compliance audit |

---

## 7. Future Work: Scaling to Production

While the 4-hour prototype satisfies all academic lab requirements without external database overhead, an enterprise-grade deployment requires:

1. **Persistent Relational Database (PostgreSQL):**
   * Schema for historical pull request archives.
   * Long-term trend tracking of engineering sprint health across quarters.
2. **Asynchronous Ingestion (Celery + Redis):**
   * Eliminating HTTP request timeouts when auditing large repos (e.g., 5,000+ PRs).
   * Ingesting live GitHub Webhooks on `pull_request.closed` events.
3. **Reviewer Workload Modeling:**
   * Tracking the concurrency of reviewers at PR creation timestamp.
   * Modeling reviewer fatigue using Bayesian regression.
4. **Export Engine:**
   * Automated PDF report generation using ReportLab or headless browser rendering.

---

## 8. Conclusion

RevAudit demonstrates that software engineering metrics cannot rely on crude averages. By segmenting pull requests into size-controlled cohorts and evaluating review duration against non-parametric medians with confidence intervals, the system reveals true review bottlenecks while filtering out superficial noise. The project stands as a fully functioning, verifiable prototype engineered to Dr. Sukhpal Singh's laboratory standards.

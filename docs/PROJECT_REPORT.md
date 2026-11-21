# RevAudit: Empirical Pull Request Code Review Effort Anomaly Detection System

**Academic Lab Project Report & Software Design Document**  
**Submitted to:** Dr. Sukhpal Singh  
**Course:** Software Engineering Laboratory  
**Organization:** Team ArchCoders  
**Team Members:**
* **Sparsh Khandelwal** — Backend & Statistical Math Engine Lead
* **Dheeraj** — System Architecture & UML Modeling Lead
* **Adityaraj Singh** — Frontend & UI/UX Integration Lead
* **Vaibhav Goyal** — Verification, Edge Cases & QA Lead

**Date:** September 2026  
**Repository:** `/Users/sparshkhandelwal/Desktop/RevAudit`

---

## Executive Summary & Abstract

Code review turnaround time is one of the most widely referenced engineering velocity metrics in modern collaborative software development. However, flat metrics like arithmetic mean "time-to-merge" fail empirically because they do not control for confounding variables—chiefly pull request (PR) complexity and reviewer workload. This creates perverse incentives where reviewers are rewarded for trivial, uncritical approvals ("LGTM") and penalized for thorough investigations of large, high-risk code modifications.

**RevAudit** is an academic prototype engineered to solve this "Invisible Variation" problem. Built within a rapid-prototyping window, RevAudit connects to GitHub's REST API v3, paginates pull-request history, persists PR and review-event records, and optionally uses GitHub OAuth for user-scoped access. It imputes missing data by discarding unmerged PRs, stratifies PRs into complexity cohorts using body length proxies, computes non-parametric median review latencies with 90% confidence intervals, adds a transparent reviewer-workload queue proxy, and flags review effort anomalies (> 1.5× group median). The accompanying web application serves dual purposes: an interactive slide deck for academic evaluation and an operational audit dashboard with PDF export.

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

The statistical engine in RevAudit executes a censoring-aware analytical pipeline:

```
[Raw GitHub PRs] ─> [Timeline & Review Events] ─> [Right-Censoring] ─> [Scope Cohorts]
       ─> [Kaplan–Meier & Bootstrap 95% CI] ─> [Robust + Workload Triage] ─> [Persistence & Reporting]
```

### 2.1 Survival Bias Correction (Censoring)
Open pull requests that have not received a first human review are not discarded. They are **right-censored** at the audit timestamp, and closed-unmerged PRs are censored at closure. Censored observations contribute exposure time without being treated as completed review events:
$$\mathcal{D}_{\text{censored}} = \{ \text{PR}_i \mid \text{first\_review}_i = \text{null} \}$$

### 2.2 Review Effort Latency Calculation
The primary outcome is **time to first human review** (queue latency), measured from review eligibility:
$$\Delta t_i = \frac{\text{Timestamp}(\text{first\_human\_review}_i) - \text{Timestamp}(\text{eligible\_at}_i)}{3600\text{ seconds}}$$
For draft PRs, `eligible_at` is the first `ready_for_review` event; otherwise it is `created_at`. Bot authors and bot reviewers are excluded from cohort and model estimates.

### 2.3 PR Complexity Stratification
Ratings are based on the PR diff, not description length:
$$\text{Cohort}(\text{PR}_i) = \begin{cases}
\text{Small} & \text{churn} \le 100 \text{ and files} \le 5 \\
\text{Medium} & \text{churn} \le 1000 \text{ and files} \le 20 \\
\text{Large} & \text{above either medium cutoff} \\
\text{Unknown} & \text{diff metadata unavailable}
\end{cases}$$
where $\text{churn} = \text{additions} + \text{deletions}$. The Complexity Coach in the contributor dashboard separately uses the 1,000-character description threshold as drafting guidance only.

### 2.4 Non-Parametric Central Tendency
For each cohort $C \in \{\text{Small}, \text{Medium}, \text{Large}, \text{Unknown}\}$, the baseline is the **Kaplan–Meier median** first-review latency, which remains valid under right-censoring. The median is chosen because it has a breakdown point of 50%, guaranteeing robustness against extreme outliers.

### 2.5 Bootstrap 95% Confidence Interval
When a cohort has at least 10 observations and 5 observed events, a percentile bootstrap over 500 resamples of the Kaplan–Meier median produces a non-parametric 95% interval:
$$CI_{95}(C) = \left[\text{percentile}_{2.5}(\hat{\tilde{x}}_C),\; \text{percentile}_{97.5}(\hat{\tilde{x}}_C)\right]$$
If support is insufficient, the interval is reported as unavailable rather than fabricated.

### 2.6 Robust and Workload-Adjusted Triage
RevAudit reports two complementary process signals.

**Robust residual model.** A Huber robust regression predicts $\log(1 + \Delta t_i)$ from change churn, files changed, first-time contributor status, and prior-7-day reviewer activity. Standardized residuals with $|z| \ge 2.5$ are triaged in either direction (slower or faster than expected).

**Workload-adjusted threshold.** The Phase 3 rule reconstructs the reviewer's active queue from explicit `review_requested` events:
$$\text{Dynamic\_Threshold}_i = 1.5 + 0.15 \cdot Q_i$$
where $Q_i$ is the number of other sampled PRs still open at this PR's ready-for-review time and already waiting on the eventual first reviewer. The threshold in hours is $\text{Dynamic\_Threshold}_i \times \tilde{x}_{C(i)}$. The **Variance Ratio** remains:
$$\mathcal{R}_i = \frac{\Delta t_i}{\tilde{x}_{C(i)}}$$
Both signals are triage aids for process investigation, not judgments of review quality or individual performance.

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
│ (OAuth, CORS, Pagination, Review Sync, PDF, JSON API)  │
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
Models user authentication, OAuth state validation, encrypted server-side token persistence, and session restoration in the frontend.

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
Documents the implemented reporting subsystem: client serialization of the audit response, backend PDF compilation using ReportLab, and binary stream download to the client.

### 4.6 Domain Class Diagram
*File: `docs/diagrams/06_class_diagram.puml`*
Specifies the primary domain model entities:
* `User`: Attributes (`id`, `github_id`, `username`, `role`), methods (`get_assigned_prs()`, `get_review_history()`).
* `Repository`: Attributes (`id`, `owner`, `name`, `last_audited_at`), methods (`fetch_closed_prs()`, `compute_repo_health()`).
* `PullRequest`: Attributes (`number`, `body_length`, `review_time_hours`, `size_category`, `first_review_at`, `reviewer_workload`, `is_anomaly`), methods (`calculate_review_time()`, `categorize_size()`).
* `ReviewEvent`: Attributes (`id`, `github_review_id`, `reviewer_id`, `state`, `submitted_at`, `reviewer_workload`), methods (`is_approving()`).
* `AuthSession`: Attributes (`session_hash`, `user_id`, `encrypted_access_token`, `expires_at`) for server-side GitHub OAuth sessions.
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
| **Adityaraj Singh** | Frontend & UI/UX Integration | • React + Tailwind CSS dashboard (`frontend/src/App.jsx`)<br>• Dual-view navigation (Presentation Deck vs. Live Demo)<br>• Responsive KPI cards & flagged anomalies matrix<br>• Interactive PlantUML source code inspectors |
| **Vaibhav Goyal** | QA & Verification | • Live endpoint verification against live repositories<br>• Error state testing (404 repo not found, 403 rate limits)<br>• Presentation rehearsal & academic compliance audit |

---

## 7. Phase 2–4 Implementation and Remaining Production Work

The implementation now includes the production-oriented upgrades that were
previously represented only in the architecture diagrams and upgrade plan:

1. **Persistent relational storage:** SQLAlchemy models store repositories,
   users, pull requests, review events, workload-adjusted fields, and encrypted
   OAuth sessions. Completed audits and webhook deliveries are mirrored into
   the database, and `GET /api/history` serves the historical record.
2. **Paginated ingestion:** GitHub `Link` headers are followed up to a bounded
   page limit, with incremental stopping at the last repository sync.
3. **GitHub OAuth:** The FastAPI callback validates OAuth state, encrypts the
   access token server-side, and exposes session state to the frontend.
4. **Webhook ingestion:** `POST /api/webhook/github` verifies HMAC-SHA256 and
   processes `pull_request.closed` events with FastAPI `BackgroundTasks`.
5. **Censoring-aware statistics:** Kaplan–Meier medians, bootstrap 95%
   confidence intervals, and Huber robust residual triage replace the early
   mock-confidence-interval prototype.
6. **Workload-adjusted thresholds:** The Phase 3 rule
   `1.5 + (0.15 × active_prs_in_queue)` is reported alongside the robust
   residual model, with explicit review-request coverage.
7. **Role-based dashboards:** Protected reviewer, contributor, and manager
   routes provide a smart triage queue, a complexity coach, and a print-ready
   manager report.
8. **Reporting:** The audit payload can be exported through the ReportLab
   endpoint or printed natively from the manager dashboard.
9. **Browser extension:** A Manifest V3 popup supports public mode and
   GitHub OAuth/PAT sign-in, calls the same v2 audit endpoint, and persists audit
   state in the service worker so closing the popup does not cancel an audit.

Remaining production work includes organisation-level authorization (role
claims rather than route selection), GitHub App installation tokens and webhook
delivery retries, Chrome Web Store publication for the extension, and
load/performance testing against large real-world histories.

---

## 8. Conclusion

RevAudit demonstrates that software engineering metrics cannot rely on crude averages. By segmenting pull requests into size-controlled cohorts and evaluating review duration against non-parametric medians with confidence intervals, the system reveals true review bottlenecks while filtering out superficial noise. The project stands as a fully functioning, verifiable prototype engineered to Dr. Sukhpal Singh's laboratory standards.

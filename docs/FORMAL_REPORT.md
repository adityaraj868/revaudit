# RevAudit

## Censoring-Aware Analysis of Pull Request Review Effort

### A Complete Project Report

**Course:** UCS503 Software Engineering Laboratory  
**Institution:** Thapar Institute of Engineering and Technology  
**Team:** ArchCoders — Dheeraj Kumar, Vaibhav Goyal, Adityaraj Singh, Sparsh Khandelwal  
**Faculty Advisor:** Dr. Sukhpal Singh  
**Version:** 2.0  
**Date:** 21 November 2026  

**Repository:** <https://github.com/adityaraj868/revaudit>  
**Branch:** `deploy`  
**Frontend:** <https://adityaraj868.github.io/revaudit/>  
**API:** <https://revaudit-backend.onrender.com>  

---

## Declaration

We declare that this report and the associated implementation were prepared by Team
ArchCoders for UCS503 Software Engineering Laboratory. The statistical methods,
system architecture, implementation, testing, and deployment described here were
developed as part of the project. External libraries and services are acknowledged
in the References section.

## Acknowledgement

We thank Dr. Sukhpal Singh for guidance on the project scope, statistical framing,
and academic presentation. We also acknowledge the open-source maintainers of
GitHub's REST API, FastAPI, SQLAlchemy, NumPy, React, Vite, Tailwind CSS, Supabase,
and ReportLab, whose documentation and tooling supported this work.

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Background and Related Concepts](#3-background-and-related-concepts)
4. [Requirements and Stakeholders](#4-requirements-and-stakeholders)
5. [System Architecture](#5-system-architecture)
6. [Data Ingestion and Persistence](#6-data-ingestion-and-persistence)
7. [Statistical Methodology](#7-statistical-methodology)
8. [Backend Implementation](#8-backend-implementation)
9. [Frontend Implementation](#9-frontend-implementation)
10. [Deployment and Operations](#10-deployment-and-operations)
11. [Testing and Verification](#11-testing-and-verification)
12. [Results and Discussion](#12-results-and-discussion)
13. [Ethics, Privacy, and Governance](#13-ethics-privacy-and-governance)
14. [Limitations and Future Work](#14-limitations-and-future-work)
15. [Conclusion](#15-conclusion)
16. [References](#16-references)
17. [Appendix A — API Reference](#appendix-a--api-reference)
18. [Appendix B — Database Schema](#appendix-b--database-schema)
19. [Appendix C — Environment Variables](#appendix-c--environment-variables)
20. [Appendix D — Test Inventory](#appendix-d--test-inventory)
21. [Appendix E — Reproduction Guide](#appendix-e--reproduction-guide)
22. [Appendix F — Glossary](#appendix-f--glossary)

---

## 1. Abstract

Pull request (PR) review is a queueing process, but most engineering dashboards
measure only time-to-merge or average review duration. Those metrics conflate code
complexity, reviewer workload, abandoned work, and open PRs that have never been
reviewed. They also create perverse incentives: trivial changes are approved
quickly while large, high-risk changes are delayed.

RevAudit is a full-stack analytical system that measures **time to first human
review** rather than time-to-merge. It samples GitHub pull requests, enriches them
with timeline and review events, treats unreviewed and open PRs as right-censored
observations, and estimates cohort baselines with Kaplan–Meier medians and
bootstrap 95% confidence intervals. It classifies PRs by changed lines and files,
fits a Huber robust regression on log-transformed first-review latency, and reports
process triage signals alongside a workload-adjusted threshold:

```text
Dynamic_Threshold = 1.5 + (0.15 × active_prs_in_queue)
```

The implementation consists of a FastAPI backend with GitHub OAuth, Supabase/Postgres
persistence, signed webhook ingestion, and PDF export; and a React single-page
application with protected reviewer, contributor, and manager dashboards, a smart
triage queue, a complexity coach, and a print-ready manager report. The system is
deployed with the frontend on GitHub Pages, the API on Render, authentication and
PostgreSQL on Supabase, and GitHub webhooks for closed-PR ingestion.

Verification includes 22 backend tests, browser-level end-to-end checks of routing,
role gates, queue ordering, complexity warnings, and print behaviour, plus live
audits against public repositories and persistence/history checks against PostgreSQL.
The report also documents the statistical assumptions, deployment configuration,
ethical boundaries, and remaining gaps, including the distinction between
route-based role views and true role-based access control.

**Keywords:** code review, review latency, survival analysis, Kaplan–Meier,
right-censoring, robust regression, reviewer workload, GitHub API, FastAPI, React,
Supabase, deployment.

---

## 2. Introduction

### 2.1 Problem Statement

Software teams routinely track “time-to-merge” as a proxy for review health. The
metric is easy to compute from GitHub and easy to display, but it is not a review
metric. It measures the entire lifecycle: implementation, CI, author revisions,
review waits, approval delays, and merge policy. A ten-line bug fix that waits two
days and a two-thousand-line refactor that merges in two days receive the same
score, even though the first indicates queue stagnation and the second may indicate
excellent review throughput.

Three confounders dominate:

1. **PR size.** Larger changes require more reading, more context, and more
   iterations. Comparing raw review times across sizes is misleading.
2. **Reviewer workload.** A reviewer carrying several active PRs cannot provide the
   same latency as an idle reviewer. Queue pressure is not a property of the PR.
3. **Survivorship and censoring.** Open or closed-without-review PRs are often
   dropped from “completed review” averages. Dropping them systematically
   underestimates queue latency because the slowest cases disappear.

The result is a metric that rewards superficial approvals on trivial PRs and
penalizes thorough review of complex work.

### 2.2 Project Objectives

RevAudit was built with the following objectives:

1. Define and compute a defensible primary outcome: **time from review eligibility
   to the first human review**.
2. Preserve open and unreviewed PRs as **right-censored** observations instead of
   discarding them.
3. Control for PR scope using changed lines and changed files, with explicit
   Unknown cohorts when metadata is missing.
4. Estimate cohort baselines non-parametrically and report uncertainty only when
   the sample supports it.
5. Model latency conditionally on scope, contributor experience, and recent
   reviewer activity using a robust regression.
6. Add a transparent workload-adjusted threshold derived from observable review
   request evidence.
7. Persist audits and webhook deliveries in a relational database for historical
   queries.
8. Provide separate contributor, reviewer, and manager experiences without turning
   the dashboard into an individual performance scorecard.
9. Be deployable with managed services: GitHub Pages, Render, Supabase, and GitHub
   webhooks.

### 2.3 Scope

The system analyzes public repositories through unauthenticated GitHub API access
and private or higher-rate repositories through a user token or OAuth session. The
unit of analysis is a pull request. The primary statistical output is a set of
cohort baselines, adjusted triage signals, and workload metrics. The system does
not attempt to measure code quality, reviewer competence, or individual
productivity.

### 2.4 Contributions

- A censoring-aware review-latency pipeline built on GitHub's public REST API.
- A hybrid statistical engine combining Kaplan–Meier estimation, bootstrap
  intervals, Huber robust regression, and a workload-adjusted ratio rule.
- A persistence and webhook layer that converts a stateless analysis endpoint into
  a historical audit system.
- A role-oriented frontend with distinct workflows for contributors, reviewers,
  and managers.
- A deployment blueprint spanning Supabase Auth/PostgreSQL, Render, and GitHub
  Pages.
- A reproducible verification suite covering statistics, persistence, webhook
  signatures, PDF generation, and browser-level UI behaviour.

---

## 3. Background and Related Concepts

### 3.1 Review Latency

Review latency is a queueing metric. In a single-reviewer queue, the waiting time
depends on arrival rate, service time, and the reviewer's current backlog. In a
multi-reviewer repository, assignment policy and reviewer availability dominate.
Time-to-merge includes several stages after the first review, so it is not a clean
measure of queue delay.

RevAudit therefore defines the primary outcome from the moment a PR becomes
eligible for review to the moment a non-bot human submits the first review. For
draft PRs, eligibility begins at the first `ready_for_review` event.

### 3.2 Right-Censoring and Survival Analysis

If a PR has not received a first review by the audit timestamp, its true latency is
unknown but at least the observed age. Discarding it biases the sample toward fast
reviews. Right-censoring retains that lower bound.

The Kaplan–Meier estimator handles censored observations by updating survival at
each event time using the number still at risk. The median is the first time the
estimated survival drops to or below 0.5.

### 3.3 Robust Regression

Review latency is heavy-tailed. Ordinary least squares is sensitive to extreme
outliers and to leverage points. RevAudit models `log(1 + hours)` with a Huber
M-estimator using iteratively reweighted least squares. Residuals are standardized
with the median absolute deviation, and large absolute residuals are reported as
triage signals rather than causal findings.

### 3.4 Reviewer Workload

GitHub exposes review requests and review events, but not a complete historical
view of every reviewer's assignment queue. RevAudit uses two observable proxies:

- **Recent activity:** the number of human reviews submitted by the eventual first
  reviewer in the seven days before the first review.
- **Active queue at creation:** other sampled PRs that were still open at this PR's
  ready-for-review time and already had an explicit review request for the eventual
  first reviewer.

Both are transparent and bounded by the sampled window. Neither claims to be a
complete assignment history.

### 3.5 Role-Based Analytics

Different stakeholders ask different questions:

- **Contributors** want to know whether their PRs are waiting, which are active,
  and how to prepare a reviewable change.
- **Reviewers** want an actionable queue ordered by review cost and age.
- **Managers** want cohort baselines, adjusted signals, and a printable summary.

A single dashboard forces all three into one view. RevAudit separates the
workflows by route while keeping a shared data payload.

---

## 4. Requirements and Stakeholders

### 4.1 Stakeholders

| Stakeholder | Primary need | RevAudit view |
|---|---|---|
| Contributor | Understand active PRs and draft reviewable changes | Contributor Dashboard |
| Reviewer | Triage incoming work efficiently | Reviewer Triage Queue |
| Engineering manager | Inspect baselines, anomalies, and workload | Manager Report |
| Researcher / instructor | Audit methodology and reproducibility | Methodology, Presentation, Report |
| Auditor | Inspect evidence behind a flagged PR | Evidence modal and PR links |

### 4.2 Functional Requirements

| ID | Requirement | Implementation |
|---|---|---|
| FR-1 | Ingest paginated GitHub PRs and timeline events | `/api/audit`, GitHub REST client |
| FR-2 | Preserve open/unreviewed PRs as censored | `statistical_engine.py` |
| FR-3 | Estimate cohort medians and 95% intervals | Kaplan–Meier + bootstrap |
| FR-4 | Detect adjusted process signals | Huber residual model |
| FR-5 | Apply workload-adjusted thresholds | `annotate_workload_thresholds` |
| FR-6 | Persist audits and webhook events | `persistence.py` |
| FR-7 | Verify webhook authenticity | HMAC-SHA256 |
| FR-8 | Provide historical queries | `/api/history` |
| FR-9 | Export a portable report | ReportLab PDF + print CSS |
| FR-10 | Separate contributor/reviewer/manager views | React routes |
| FR-11 | Protect role views | `RequireAuth` |
| FR-12 | Show loading and cold-start feedback | Skeletons + toast |
| FR-13 | Coach contributors on large drafts | Complexity Coach |

### 4.3 Non-Functional Requirements

| Area | Requirement |
|---|---|
| Security | Secrets in environment variables; encrypted OAuth tokens; HMAC webhook verification |
| Privacy | No posting or mutation of GitHub data; read-only scopes; no individual performance score |
| Performance | Bounded pagination; parallel enrichment; in-memory audit cache |
| Reliability | Idempotent upserts; retry on unique conflicts; clear error states |
| Usability | Responsive dark UI; role-specific navigation; print-ready manager report |
| Deployability | Managed Postgres/Auth; Render API; GitHub Pages frontend |
| Maintainability | Modular backend files; typed-ish schemas; documented environment |

### 4.4 Assumptions and Constraints

- GitHub's public API may rate-limit unauthenticated traffic; the audit cap is 25
  PRs without a token.
- Review request history is incomplete outside the sampled window.
- GitHub team-based review requests are not resolved to individual reviewers.
- Repository data can change between pages; the audit is a point-in-time sample.
- The free Render tier cold-starts; the UI communicates this rather than hiding it.

---

## 5. System Architecture

### 5.1 High-Level Architecture

```text
┌──────────────────────┐        HTTPS / JSON        ┌──────────────────────────┐
│ React SPA            │ ─────────────────────────► │ FastAPI on Render        │
│ GitHub Pages         │ ◄───────────────────────── │ audit · auth · stats     │
│ base: /revaudit/     │                            │ webhooks · history · PDF │
└─────────┬────────────┘                            └───────┬─────────┬────────┘
          │ Supabase OAuth redirect                          │         │
          ▼                                                  │         │ REST
┌──────────────────────┐                                     │         ▼
│ Supabase Auth        │  provider_token → Authorization     │  ┌──────────────┐
│ GitHub provider      │ ───────────────────────────────────►│  │ GitHub API   │
└──────────────────────┘                                     │  └──────────────┘
                                                             │ SQLAlchemy
                                                             ▼
                                                  ┌──────────────────────────┐
                                                  │ Supabase PostgreSQL      │
                                                  │ users · repositories     │
                                                  │ pull_requests · reviews  │
                                                  │ auth_sessions            │
                                                  └──────────────────────────┘

GitHub webhook ──► POST /api/webhook/github ──► BackgroundTasks ──► DB
```

### 5.2 Request Flows

**Audit flow**

1. The SPA requests `/api/audit?owner=<owner>&repo=<repo>` with optional bearer
   token.
2. FastAPI selects the token: bearer header, server-side OAuth session, or
   `GITHUB_TOKEN`.
3. The GitHub client paginates `/repos/{owner}/{repo}/pulls` (100/page) up to the
   requested sample limit.
4. Each PR is enriched with `/pulls/{number}` (change size) and
   `/issues/{number}/timeline` (review events, review requests, ready-for-review).
5. Records are normalized, censored, and passed to the statistical engine.
6. Baselines, robust model, workload thresholds, stage metrics, and anomalies are
   computed.
7. The response is cached for five minutes when unauthenticated.
8. A background task mirrors the payload into PostgreSQL.

**Webhook flow**

1. GitHub sends `pull_request.closed` with `X-Hub-Signature-256`.
2. FastAPI verifies the HMAC in constant time.
3. The endpoint returns `200` immediately.
4. A background task fetches the PR detail, timeline, and reviews with
   `GITHUB_TOKEN`, builds a record, and upserts it.

**Auth flow**

1. The frontend starts Supabase GitHub OAuth with `repo read:user` scopes.
2. Supabase redirects back to the Pages URL with a session.
3. The SPA stores the GitHub `provider_token` and attaches it as a bearer token.
4. The backend validates it against GitHub and uses it for audits.

### 5.3 Technology Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Frontend | React | 19.2.8 | Component model, mature ecosystem |
| Build | Vite | 5.4.21 | Fast dev server, static build |
| Styling | Tailwind CSS | 4.3.3 | Consistent dark design system |
| Routing | react-router-dom | 7.18.6 | Hash routes for Pages compatibility |
| Auth client | @supabase/supabase-js | 2.119.0 | Managed GitHub OAuth |
| Icons | lucide-react | 1.45.0 | Lightweight SVG icons |
| Backend | FastAPI | 0.165.0 | Typed API, OpenAPI, BackgroundTasks |
| Server | Uvicorn | 0.54.0 | ASGI server |
| ORM | SQLAlchemy | 2.1.9 | Portable Postgres/SQLite models |
| Math | NumPy | 2.5.5 | KM, bootstrap, regression |
| PDF | ReportLab | 5.1.0 | Server-side report generation |
| Crypto | cryptography | 50.0.2 | Fernet token encryption |
| Database | PostgreSQL / SQLite | 17.12 / local | Managed production / local dev |
| Auth + DB | Supabase | managed | OAuth provider + Postgres |
| API host | Render | free web service | Simple Python deployment |
| Frontend host | GitHub Pages | static | Zero-cost static hosting |

### 5.4 Repository Structure

| Path | Purpose |
|---|---|
| `backend/main.py` | FastAPI app, audit, auth, history, webhook, PDF endpoints |
| `backend/statistical_engine.py` | Cohorts, KM, bootstrap, Huber model, workload thresholds |
| `backend/persistence.py` | Idempotent database mirror |
| `backend/webhooks.py` | HMAC verification and background ingestion |
| `backend/auth.py` | Encrypted OAuth session helpers |
| `backend/models.py` | SQLAlchemy entities |
| `backend/reporting.py` | ReportLab PDF generation |
| `backend/tests/` | Unit and integration tests |
| `frontend/src/App.jsx` | Route shell, audit state, auth wiring |
| `frontend/src/components/` | Dashboards and visual components |
| `frontend/src/lib/` | API and Supabase clients |
| `docs/` | Reports, implementation guide, PlantUML diagrams |
| `render.yaml` | Render service definition |
| `.github/workflows/deploy-frontend.yml` | GitHub Pages build/deploy |

### 5.5 Deployment Topology

- **Supabase** hosts GitHub OAuth and PostgreSQL.
- **Render** hosts the FastAPI service (`revaudit-backend`).
- **GitHub Pages** hosts the built SPA at `/revaudit/`.
- **GitHub webhooks** deliver closed-PR events to Render.

Cross-site cookies use `SameSite=None` when `COOKIE_SECURE=true`; the GitHub Pages
origin is allowed through `FRONTEND_URL`, while OAuth redirects preserve the
`/revaudit/` path.

---

## 6. Data Ingestion and Persistence

### 6.1 GitHub REST Integration

The audit endpoint requests recent PRs with:

```text
GET /repos/{owner}/{repo}/pulls
    ?state=all
    &sort=created
    &direction=desc
    &per_page=100
```

Pagination follows the `Link: rel="next"` header. The sample limit is user
configurable up to 200, but unauthenticated requests are capped at 25 PRs to avoid
exhausting GitHub's 60 requests/hour IP limit. Authenticated requests use the
5,000 requests/hour budget.

### 6.2 Per-PR Enrichment

For each PR, the backend requests:

- `GET /repos/{owner}/{repo}/pulls/{number}` — additions, deletions, changed files.
- `GET /repos/{owner}/{repo}/issues/{number}/timeline` — reviews, author comments,
  review requests, ready-for-review events.

Enrichment runs in batches of six PRs with three worker threads. A rate-limit
response stops further enrichment and marks the audit partial; the partial sample
is still returned with explicit warnings.

### 6.3 Normalization

Each record stores:

- identity: PR number, title, author, association, URL, state;
- timing: created, ready-for-review, merged, closed, first review;
- scope: additions, deletions, changed lines, files, cohort;
- review history: human reviews, review requests, rounds;
- censoring: whether a first review was observed and why not;
- derived: latency, workload proxy, thresholds, model prediction.

Bot authors (`[bot]`, Dependabot, Renovate, GitHub Actions, Codecov, etc.) are
excluded from cohort and model estimates. Bot reviewers are ignored. The PR remains
in the sample totals but does not influence baselines.

### 6.4 Censoring Rules

- If a first human review exists: event observed, latency computed.
- If no review and the PR is open: right-censored at audit time.
- If no review and the PR is closed unmerged: censored at closure.
- If the timeline could not be fetched: the PR is excluded from survival
  estimates and a warning is emitted.

### 6.5 Relational Schema

Five tables are used:

| Table | Purpose |
|---|---|
| `repositories` | Owner/name, default branch, last sync |
| `users` | GitHub identity, avatar, login |
| `pull_requests` | One row per PR with scope, timing, review, and workload fields |
| `review_events` | Human review events with state and timestamp |
| `auth_sessions` | Hashed session ID and encrypted OAuth token |

The `pull_requests` table includes Phase 3 fields:
`reviewer_queue_at_creation`, `dynamic_threshold_ratio`,
`dynamic_threshold_hours`, `workload_ratio_to_median`, and
`is_workload_anomaly`.

### 6.6 Idempotency and Concurrency

Audit persistence and webhook ingestion may overlap. The persistence module:

- serialises writes with a process-wide lock;
- uses savepoints and retries when a unique constraint is violated;
- upserts users, repositories, PRs, and reviews;
- deduplicates reviews by GitHub review ID when available, otherwise by reviewer,
  state, and timestamp.

This prevents duplicate users or PRs when a background audit and a webhook arrive
together.

### 6.7 Caching

Unauthenticated, non-refreshed audits are cached in memory for five minutes, with
a maximum of 64 entries. Authenticated requests are not cached because the result
depends on the user's token and permissions.

---

## 7. Statistical Methodology

### 7.1 Primary Outcome

For PR *i* in cohort *C*:

```text
eligible_at_i = first ready_for_review event, or created_at
first_review_at_i = earliest non-bot human review
Δt_i = (first_review_at_i − eligible_at_i) / 3600 hours
```

If no human review exists, Δt is the observed age at closure or audit time and the
observation is right-censored.

### 7.2 Scope Cohorts

```text
churn = additions + deletions
Small   : churn ≤ 100    and files ≤ 5
Medium  : churn ≤ 1000   and files ≤ 20
Large   : above either medium threshold
Unknown : diff metadata unavailable
```

The description-length thresholds (250 / 1,000 characters) are used only by the
contributor Complexity Coach as drafting guidance, not by the statistical engine.

### 7.3 Kaplan–Meier Median

Records are sorted by time. At each event time:

```text
S(t) = S(t_prev) × (1 − events_at_t / at_risk_at_t)
```

The median is the first event time where `S(t) ≤ 0.5`; otherwise the median is
reported as `median_not_reached`.

### 7.4 Bootstrap Confidence Interval

When a cohort has at least 10 records and at least 5 events, the engine draws 500
bootstrap resamples of the Kaplan–Meier median and reports the 2.5th and 97.5th
percentiles as a 95% interval. If too few resamples produce a median, the interval
is reported unavailable. This is a non-parametric interval, not a fabricated
standard-error approximation.

### 7.5 Huber Robust Regression

The model uses observed first reviews with complete scope and activity data:

```text
y_i = log(1 + Δt_i)
x_i = [1, log1p(churn), log1p(files),
       first_time_contributor, log1p(reviewer_activity_7d)]
```

A Huber M-estimator is fitted with iteratively reweighted least squares. Residuals
are centered on the median and scaled by `1.4826 × MAD`. A PR is a triage signal
when `|z| ≥ 2.5`, in either direction. The model requires at least 25 observations
with variation; otherwise it reports `insufficient_data` or
`insufficient_variation` instead of failing silently.

### 7.6 Workload-Adjusted Threshold

For each PR with a first reviewer and a ready time:

1. Gather explicit `review_requested` events for that reviewer across sampled PRs.
2. Count other sampled PRs that were open at this PR's ready time and had already
   requested that reviewer.
3. Let that count be *Q*. Apply:

```text
Dynamic_Threshold = 1.5 + (0.15 × Q)
threshold_hours = Dynamic_Threshold × cohort_median
```

A PR is workload-flagged when its first-review latency exceeds `threshold_hours`.
The engine reports `request_coverage_pct`; if explicit review-request evidence is
missing, the queue is not asserted and coverage is shown as low.

### 7.7 Stage Metrics

- Request → first review: from the latest review request before the first review.
- Author response after review: first author issue comment after the first review
  (a comment proxy, not a code-change measure).
- Approval → merge: from the latest approval to merge.

### 7.8 Workload Summary

For PRs with a first review, the engine reports:

- average and maximum recent reviewer activity;
- Pearson correlation between activity and first-review latency;
- OLS slope in hours per additional recent review;
- sample size and review-event count;
- an explicit definition of the proxy.

### 7.9 Interpretation

The system reports **process signals**, not quality scores. A long latency may
reflect queue pressure, unclear requirements, CI failures, time zones, or reviewer
availability. A short latency does not prove a thorough review. This framing is
implemented in the UI copy, the manager report, and the ethical safeguards view.

---

## 8. Backend Implementation

### 8.1 Application Structure

The backend is a FastAPI application with 17 Python modules and approximately 3,426
lines of code. Key modules:

- `main.py` — application, endpoints, GitHub client, cache, CORS, sessions.
- `statistical_engine.py` — all statistical calculations.
- `persistence.py` — database mirror.
- `webhooks.py` — signature verification and ingestion.
- `auth.py` — encrypted server-side sessions.
- `reporting.py` — PDF generation.
- `models.py`, `database.py` — schema and engine.

### 8.2 API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Service status and feature map |
| GET | `/auth/github/login` | Start backend OAuth |
| GET | `/auth/github/callback` | Validate state and create session |
| GET | `/api/auth/me` | Current profile from bearer or session |
| POST | `/api/auth/logout` | Revoke session |
| GET | `/api/audit` | Paginated audit and statistics |
| GET | `/api/history` | Persisted PR/review mirror |
| POST | `/api/webhook/github` | Signed webhook ingestion |
| POST | `/api/reports/pdf` | PDF export |

Full request/response details appear in Appendix A.

### 8.3 Authentication and Rate Limits

Two authentication paths coexist:

1. **Supabase OAuth** (primary for deployment): the SPA obtains a GitHub
   `provider_token`, stores it, and sends it as `Authorization: Bearer`.
2. **Backend OAuth fallback**: `/auth/github/login` and callback create an encrypted
   `AuthSession`; the browser receives an HttpOnly session cookie.

The audit endpoint uses the first available token: bearer header, session token, or
`GITHUB_TOKEN`. Without a token, samples are capped at 25 PRs. OAuth sessions last
30 days; tokens are encrypted with Fernet using a key derived from `SESSION_SECRET`.
Session cookies use `SameSite=None` when `COOKIE_SECURE=true` so the Pages frontend
can talk to Render cross-site.

### 8.4 Parallel Enrichment and Error Handling

GitHub requests time out after 20 seconds. Enrichment uses a thread pool to reduce
wall-clock time. A 404 produces an actionable message; 403/429 responses expose rate
limit reset information; network errors become 502 responses. A rate limit during
enrichment marks the result partial rather than discarding the whole audit.

### 8.5 PDF Reporting

`POST /api/reports/pdf` accepts the audit JSON and renders:

- repository and audit metadata;
- PR/merged/first-review/censoring counts;
- cohort baseline matrix with 95% intervals;
- robust triage signals;
- workload-adjusted threshold matrix;
- workload snapshot and interpretation notes.

The exporter handles missing medians, missing intervals, and legacy payloads. The
manager dashboard additionally supports native browser printing with a dedicated
`@media print` stylesheet.

### 8.6 Configuration

Environment variables are documented in Appendix C. Production requires
`DATABASE_URL`, `GITHUB_TOKEN`, `FRONTEND_URL`, `SESSION_SECRET`,
`COOKIE_SECURE=true`, `GITHUB_WEBHOOK_SECRET`, and `PERSIST_AUDITS=true`.
OAuth fallback credentials are optional when Supabase Auth is used.

---

## 9. Frontend Implementation

### 9.1 Routing

The SPA uses `react-router-dom` with `HashRouter`, which keeps deep links working on
GitHub Pages without server rewrites. The Vite base path is `/revaudit/`.

| Route | View |
|---|---|
| `#/` | Landing page |
| `#/overview` | Repository overview and live audit metrics |
| `#/reviewer` | Smart Triage Queue |
| `#/contributor` | Contributor history, active PRs, Complexity Coach |
| `#/manager` | Print-ready manager report |
| `#/analysis` | Detailed review analysis |
| `#/patterns` | Detected patterns |
| `#/methodology` | Methodology and PlantUML |
| `#/presentation` | Presentation deck |
| `#/ethics` | Ethical safeguards |

### 9.2 Authentication Gate

`RequireAuth` wraps the three role routes. It waits for the backend session check,
then:

- allows the route when a Supabase or backend user is present;
- otherwise shows a sign-in gate with a GitHub button;
- offers an explicitly labelled, session-scoped demo mode for local demonstrations.

Important: this is authentication-aware routing, not role-based access control.
Any authenticated user can open any role route. This gap is discussed in Section
14.

### 9.3 Repository Overview

The overview preserves the project's dark analytical design: KPI cards, cohort
baselines, latency charts, stage medians, and a flagged-anomaly table. It displays
sample metadata, API authentication state, timeline coverage, and data-quality
warnings.

### 9.4 Reviewer Dashboard

The Smart Triage Queue orders PRs by cohort (`Small → Medium → Large → Unknown`),
then by open status and age. Small PRs are pinned to encourage rapid unblocking.
Modes:

- **Actionable queue** — open PRs without a first review;
- **All awaiting** — all sampled PRs without a first review;
- **All sampled** — every PR in the payload.

Each row shows the author, cohort, age, first-review state, expected latency, queue
at creation, workload multiplier, and a workload-adjusted signal badge.

### 9.5 Contributor Dashboard

The contributor view accepts an exact GitHub username and also pre-fills the
signed-in user. It displays:

- currently active PRs;
- median first-review latency;
- adjusted triage signals;
- a table of the contributor's sampled PRs with observed, expected, and censored
  states.

The **Complexity Coach** provides live feedback on a draft description:

- under 250 characters → Small drafting range;
- 250–1,000 → Medium;
- over 1,000 → Large warning with advice to split the change.

The coach states explicitly that body length is a drafting heuristic; the engine's
cohorts use changed lines and files.

### 9.6 Manager Dashboard

The manager report retains the size-stratified anomaly matrix and adds:

- robust triage matrix;
- workload-adjusted threshold matrix;
- lifecycle stage medians;
- workload and coverage KPIs;
- data-quality caveats.

`Print / Save as PDF` invokes the browser print dialog. The print stylesheet hides
navigation, header, footer, and action buttons, converts backgrounds to white, and
avoids page breaks inside tables and sections.

### 9.7 UX Resilience

- Skeleton loaders cover dashboard, queue, and table layouts.
- A cold-start toast appears after four seconds of loading with the message
  “Waking up analysis engine…” and explains the Render free-tier delay.
- Existing results remain visible during a refresh.
- Error states include actionable retry messages.

### 9.8 Design System

The UI uses a dark slate palette with orange accents, monospace numerics, and
restrained motion. The design is consistent across existing and new views. The
frontend contains approximately 6,867 lines of JSX/JS/CSS across 33 files.

### 9.9 Data Flow

`App.jsx` owns the audit state and current repository. It:

- fetches `/api/audit` with `getAuthHeaders()`;
- falls back to bundled sample data when the API is unavailable;
- forwards the Supabase provider token;
- handles PDF export and logout;
- observes Supabase auth events;
- resolves the backend `/api/auth/me` profile.

---

## 10. Deployment and Operations

### 10.1 Supabase

- GitHub OAuth provider enabled with a dedicated GitHub OAuth App.
- Callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`.
- Site URL and redirect allowlist include the Pages URL and local Vite URL.
- PostgreSQL is used for persistence; the backend connects through the Session
  pooler (`aws-1-ap-northeast-1.pooler.supabase.com:5432`) with `sslmode=require`.
- The anon/publishable key is used only in the browser; the service role key is not
  required by this application.

### 10.2 Render

`render.yaml` defines a Python web service:

```yaml
rootDir: backend
buildCommand: pip install -r requirements.txt
startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
plan: free
```

Production environment variables are listed in Appendix C. The free tier
cold-starts; the frontend masks this with the skeleton/toast.

### 10.3 GitHub Pages

`.github/workflows/deploy-frontend.yml` builds `frontend/` with Vite and publishes
`frontend/dist` through `actions/deploy-pages`. Build-time variables:

```yaml
VITE_API_BASE_URL: https://revaudit-backend.onrender.com
VITE_SUPABASE_URL: https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

The workflow triggers on the `deploy` branch. Pages source must be **GitHub
Actions**, not “Deploy from a branch”; the latter publishes the repository root and
renders `README.md` with Jekyll instead of the React app.

### 10.4 Webhooks

GitHub repository webhook:

```text
Payload URL: https://revaudit-backend.onrender.com/api/webhook/github
Content type: application/json
Secret: GITHUB_WEBHOOK_SECRET
Events: Pull requests
```

Only `pull_request.closed` is processed. The handler verifies the HMAC, returns
immediately, and ingests in the background.

### 10.5 Local Development

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

The UI is served at `http://localhost:5173/revaudit/`.

### 10.6 Operational Checks

- `GET /` returns service status and feature flags.
- `/docs` exposes OpenAPI.
- `/api/history` verifies persistence.
- A GitHub webhook ping verifies the secret and reachability.
- `POST /api/reports/pdf` verifies report generation.

---

## 11. Testing and Verification

### 11.1 Strategy

Testing combines:

1. backend unit and integration tests using `unittest` and FastAPI's TestClient;
2. static analysis and production builds for the frontend;
3. browser-level end-to-end checks with headless Chrome;
4. live GitHub API audits against public repositories;
5. database checks against Supabase PostgreSQL;
6. webhook signature and event-filter tests;
7. PDF content and validity checks.

### 11.2 Backend Test Inventory

22 tests pass. They cover:

| Module | Coverage |
|---|---|
| `test_phase1_auth.py` | Bearer extraction, audit token forwarding, auth profile |
| `test_phase2.py` | Link-header pagination, OAuth encryption/revocation, PDF output |
| `test_phase3_workload.py` | Queue reconstruction, threshold arithmetic, closed PR exclusion, missing median |
| `test_phase4_persistence.py` | Idempotent upsert, review deduplication, webhook HMAC, event filtering, review merging |
| `test_phase4_reporting.py` | v2 payload with null medians, legacy payload compatibility |

### 11.3 Frontend Verification

- `oxlint` completes with no warnings.
- `vite build` succeeds; the main bundle is approximately 707 KB (193 KB gzip).
- Headless Chrome checks confirm:
  - landing page renders;
  - role routes show the auth gate;
  - demo mode unlocks dashboards;
  - triage queue orders Small first and shows pinned badges;
  - complexity coach warns at 1,001 characters;
  - manager workload matrix renders;
  - print media hides sidebar/header;
  - deep links resolve;
  - no console errors.

### 11.4 Live API Verification

Small live samples were used to validate the pipeline:

| Repository | Sample | Merged | First reviews | Censored | Observation |
|---|---:|---:|---:|---:|---|
| `fastapi/fastapi` | 10 | 7 | 0 | 10 | Cohorts populated; model correctly reported insufficient data |
| `django/django` | 8 | 0 | 3 | 5 | Median 1.39 h; workload coverage 0% produced an explicit warning |
| `pallets/flask` | 6 | 2 | 0 | 6 | All censored; cohorts still estimated |
| `kubernetes/kubernetes` | 4 | 0 | 0 | 4 | No first reviews in the recent sample |

A larger `fastapi/fastapi` audit persisted 25 PRs to PostgreSQL and was returned by
`/api/history`, confirming the persistence path.

### 11.5 Webhook Verification

- A valid HMAC with `X-GitHub-Event: ping` returned `200 {"pong": true}`.
- An invalid signature returned `401`.
- An `opened` action was ignored; `closed` was queued.
- Missing `GITHUB_WEBHOOK_SECRET` returns `503` rather than accepting unverified
  events.

### 11.6 Deployment Verification

- Supabase `/auth/v1/settings` reports the GitHub provider enabled.
- The Supabase authorize endpoint redirects to GitHub with the correct client ID,
  callback, and scopes.
- PostgreSQL schema creation succeeds with all Phase 3 columns.
- `VITE_SUPABASE_ANON_KEY` is configured for the Pages build.
- A full human OAuth login remains the final manual check.

---

## 12. Results and Discussion

### 12.1 What the System Demonstrates

The implementation demonstrates four shifts from a naive review dashboard:

1. **From merge time to first-review latency.** The primary outcome isolates the
   review queue from implementation and merge policy.
2. **From complete-case averages to censoring-aware estimation.** Open and
   unreviewed PRs remain in the estimate instead of vanishing.
3. **From raw size buckets to adjusted signals.** Scope, experience, and recent
   reviewer activity are modeled explicitly.
4. **From a single dashboard to role workflows.** Contributors, reviewers, and
   managers see different tasks over the same data.

### 12.2 Case Study: `fastapi/fastapi`

A 10-PR sample produced seven merged PRs, two closed unmerged, and one open PR. No
first human review appeared in the sample, so all ten observations were censored.
Cohorts were populated (Small 1, Medium 5, Large 1), but the robust model correctly
reported insufficient data. A later 25-PR audit was persisted and served from
`/api/history`.

This case illustrates a strength of the design: the system does not invent a median
when no events are observed. It reports censoring, coverage, and warnings instead of
a false precision.

### 12.3 Case Study: `django/django`

An 8-PR sample contained three observed first reviews (1.39 h, 0.77 h, 18.23 h) and
five censored PRs. The observed median was 1.39 h. Workload coverage was 0% because
no explicit `review_requested` events for the eventual first reviewer appeared in
the sampled timeline, so the engine reported a low-coverage warning and did not
assert a queue.

This case shows the value and the limits of the workload proxy: absence of evidence
is surfaced rather than treated as an empty queue.

### 12.4 Case Study: `pallets/flask` and `kubernetes/kubernetes`

Recent samples contained no first reviews, leaving all PRs censored. Cohort counts
and warnings were still produced. The UI remains useful as a queue view, but no
latency baseline is claimed. This is the correct statistical behaviour.

### 12.5 Performance

- Enrichment is parallelized in small batches to reduce wall-clock time.
- The five-minute cache avoids repeated identical audits.
- Postgres persistence runs after the response, so the dashboard is not blocked by
  database writes.
- The free Render tier introduces cold-start latency; skeletons and the toast make
  this visible rather than opaque.
- Schema creation against the pooled Postgres connection took several seconds on
  first startup, then reused the schema.

### 12.6 Threats to Validity

- **Sampling bias.** Recent PRs are not a random sample of repository history.
- **Incomplete review-request history.** The queue proxy is bounded by the sampled
  window and explicit timeline events.
- **Team reviews.** GitHub team review requests are not resolved to individuals.
- **Missing timelines.** Rate limits or permissions can remove PRs from survival
  estimates.
- **Model assumptions.** Huber regression describes association, not causation.
- **Small samples.** Live validation samples were small; they demonstrate behaviour,
  not repository-level conclusions.
- **Role authorization.** The role routes are not enforced by identity or backend
  permissions.

---

## 13. Ethics, Privacy, and Governance

### 13.1 Blame-Free Framing

The UI and report repeatedly state that signals describe process patterns, not
individual performance. Shorter review time is not equated with better review, and
longer review time is not attributed to a person's competence. The ethical
safeguards view documents this boundary.

### 13.2 Data Minimization

The system stores public GitHub metadata, review events, and PR scope. It does not
store code diffs or review comment bodies except when a webhook payload provides
them. It does not post, approve, merge, or modify repositories.

### 13.3 Token Security

- Backend OAuth tokens are encrypted with Fernet before storage.
- Session IDs are hashed before storage.
- Supabase provider tokens are stored in browser local storage for API calls; they
  are not sent to the backend database.
- Webhook requests are authenticated with HMAC-SHA256.
- Secrets are supplied through environment variables and excluded from version
  control.

### 13.4 Access Control Gap

The current role system separates views by route and requires authentication, but it
does not enforce role membership. A signed-in contributor can open the manager
route. True RBAC would require a role source, per-route checks, and backend
authorization. This is documented as a limitation rather than hidden.

### 13.5 Data Retention

The database retains PR metadata and review events indefinitely unless an operator
deletes them. A production deployment should define retention, deletion, and export
policies, especially for private repositories.

---

## 14. Limitations and Future Work

### 14.1 Known Limitations

1. **No true role-based access control.** Routes are auth-gated but not role-gated.
2. **Sampled queue proxy.** Reviewer workload is reconstructed only from sampled PRs
   and explicit review requests.
3. **Single-repository audit.** Cross-repository and organization-level views are
   not implemented.
4. **No GitHub App installation tokens.** Webhooks use a personal token; private
   organization installations are not modeled.
5. **No webhook retry queue.** Failed background ingestions are not retried
   automatically.
6. **No database migration framework.** Schema evolution uses additive
   `ensure_schema` logic rather than Alembic migrations.
7. **Legacy modules remain.** `analytics.py` and parts of `github_client.py` are
   retained from earlier phases and are not on the live audit path.
8. **Small live samples.** Validation did not run a large statistical study.

### 14.2 Future Work

- Implement RBAC with a `role` column or Supabase `app_metadata`, backend
  dependencies, and per-route guards.
- Add GitHub App installation tokens and webhook delivery verification/retries.
- Reconstruct a fuller reviewer assignment history from organization data.
- Add multi-repository and organization dashboards.
- Calibrate confidence intervals and validate the robust model on larger samples.
- Add Alembic migrations and a staging database.
- Add automated browser tests to CI.
- Add accessibility and internationalization audits.
- Add retention/deletion controls for private data.

---

## 15. Conclusion

RevAudit replaces a flat time-to-merge metric with a censoring-aware measure of
review queue latency. It controls for PR scope, models reviewer activity, reports
uncertainty only when the data supports it, and separates the workflows of
contributors, reviewers, and managers. The system is implemented end to end: GitHub
ingestion, statistical analysis, relational persistence, signed webhooks, PDF
reporting, managed authentication, and cloud deployment.

The project also demonstrates the importance of honest negative results. When no
first reviews are observed, the engine says so. When workload evidence is missing,
it reports low coverage. When the robust model lacks support, it refuses to fit.
Those choices make the dashboard less decorative and more trustworthy.

The remaining work is clear: true role-based authorization, fuller assignment
history, larger validation samples, and production hardening. The current system
provides a solid, deployable foundation for those extensions.

---

## 16. References

1. GitHub REST API documentation. <https://docs.github.com/en/rest>
2. Kaplan, E. L., & Meier, P. (1958). Nonparametric Estimation from Incomplete
   Observations. *Journal of the American Statistical Association*.
3. Efron, B., & Tibshirani, R. J. (1993). *An Introduction to the Bootstrap*.
4. Huber, P. J. (1964). Robust Estimation of a Location Parameter. *Annals of
   Mathematical Statistics*.
5. FastAPI documentation. <https://fastapi.tiangolo.com/>
6. SQLAlchemy documentation. <https://docs.sqlalchemy.org/>
7. NumPy documentation. <https://numpy.org/doc/>
8. React documentation. <https://react.dev/>
9. Vite documentation. <https://vitejs.dev/>
10. Tailwind CSS documentation. <https://tailwindcss.com/docs>
11. Supabase documentation. <https://supabase.com/docs>
12. Render documentation. <https://render.com/docs>
13. GitHub Pages documentation.
    <https://docs.github.com/en/pages>
14. ReportLab documentation. <https://docs.reportlab.com/>

---

## Appendix A — API Reference

### `GET /api/audit`

Query parameters:

| Name | Type | Default | Notes |
|---|---|---|---|
| `owner` | string | required | GitHub owner |
| `repo` | string | required | Repository name |
| `limit` | int | 50 | 1–200; unauth capped at 25 |
| `refresh` | bool | false | Skip five-minute cache |

Response highlights: `owner`, `repo`, `total_prs_in_sample`,
`merged_prs_count`, `first_review_observed_count`,
`first_review_censored_count`, `observed_median_first_review_hours`,
`baseline_medians`, `anomalies`, `workload_summary`, `workload_engine`,
`workload_anomalies`, `pull_requests`, `model`, `metadata`, `data_quality`.

### `GET /api/history`

Query parameters: `owner`, `repo`, `limit` (1–500). Returns`stored`,
`last_synced_at`, `stored_prs_count`, and persisted PR rows with review events.

### `POST /api/webhook/github`

Headers: `X-GitHub-Event`, `X-Hub-Signature-256`. Body: GitHub webhook JSON.
Returns `queued` for `pull_request.closed`, `ignored` for other actions, `401` for
invalid signatures, `503` when the secret is missing.

### `POST /api/reports/pdf`

Body: audit payload. Returns `application/pdf` with a filename derived from
owner/repo.

---

## Appendix B — Database Schema

```text
repositories
  id, owner, name, default_branch, last_synced_at, created_at, updated_at

users
  id, github_id, login, avatar_url, created_at

pull_requests
  id, repo_id, pr_number, title, author_id, state, body, body_length,
  size_category, additions, deletions, changed_files, html_url,
  created_at, merged_at, closed_at, first_review_at,
  time_to_first_review_hours, reviewer_login, reviewer_workload,
  reviewer_queue_at_creation, dynamic_threshold_ratio,
  dynamic_threshold_hours, workload_ratio_to_median,
  is_workload_anomaly, review_count, review_rounds, reviews_synced_at,
  review_time_hours, is_anomaly, anomaly_ratio

review_events
  id, github_review_id, pr_id, reviewer_id, state, body,
  submitted_at, reviewer_workload

auth_sessions
  id, session_hash, user_id, encrypted_access_token, expires_at, created_at
```

---

## Appendix C — Environment Variables

### Backend

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | production | Postgres/SQLite connection |
| `GITHUB_TOKEN` | recommended | Webhook follow-up and higher rate limit |
| `GITHUB_CLIENT_ID` | fallback OAuth | Backend OAuth app |
| `GITHUB_CLIENT_SECRET` | fallback OAuth | Backend OAuth secret |
| `GITHUB_REDIRECT_URI` | fallback OAuth | `.../auth/github/callback` |
| `GITHUB_OAUTH_SCOPE` | optional | OAuth scopes |
| `FRONTEND_URL` | production | Full public frontend URL |
| `SESSION_SECRET` | production | Session signing and token encryption key |
| `COOKIE_SECURE` | production | `true` for HTTPS cross-site cookies |
| `GITHUB_WEBHOOK_SECRET` | webhook | HMAC secret |
| `PERSIST_AUDITS` | optional | `false` disables audit mirror |
| `GITHUB_MAX_PAGES` | optional | Pagination bound |
| `GITHUB_REVIEW_MAX_PRS` | optional | Review fetch bound |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend origin |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon/publishable key |

---

## Appendix D — Test Inventory

```text
backend/tests/test_phase1_auth.py
  - bearer extraction
  - audit token forwarding
  - unauthenticated auth profile
  - authenticated auth profile

backend/tests/test_phase2.py
  - Link-header pagination and sync stop
  - OAuth session encryption/revocation
  - PDF export header

backend/tests/test_phase3_workload.py
  - active queue widens threshold
  - closed PRs excluded from queue
  - empty queue enforces base threshold
  - missing median skips threshold

backend/tests/test_phase4_persistence.py
  - audit persistence and idempotency
  - incomplete payload ignored
  - valid/invalid/missing webhook secret
  - event filtering
  - review merging and bot filtering

backend/tests/test_phase4_reporting.py
  - v2 payload with missing medians
  - legacy payload compatibility
```

Run:

```bash
cd backend
python -m unittest discover -s tests -v
```

---

## Appendix E — Reproduction Guide

```bash
# Clone and install
git clone https://github.com/adityaraj868/revaudit.git
cd revaudit
git checkout deploy

# Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
# configure DATABASE_URL / SESSION_SECRET / tokens
cd backend
uvicorn main:app --reload --port 8000

# Frontend
cd ../frontend
npm install
cp .env.example .env
# configure VITE_API_BASE_URL / Supabase values
npm run dev

# Tests
cd ../backend
python -m unittest discover -s tests -v

# Production build
cd ../frontend
npm run build
```

---

## Appendix F — Glossary

| Term | Meaning |
|---|---|
| **Right-censoring** | The true event time is at least the observed time, but the event has not occurred |
| **Kaplan–Meier** | A non-parametric estimator of survival under censoring |
| **Bootstrap** | Resampling procedure used to estimate interval uncertainty |
| **Huber regression** | Robust regression that downweights large residuals |
| **Cohort** | A size bucket (Small/Medium/Large/Unknown) |
| **Robust z** | Residual standardized by median absolute deviation |
| **Active queue** | Sampled PRs open at a ready time with a review request for the eventual reviewer |
| **Triage signal** | A flagged PR for human process investigation, not a quality verdict |
| **Demo mode** | A session-scoped bypass for local demonstrations |

---

*End of report.*

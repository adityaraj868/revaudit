# RevAudit Implementation Guide

This guide documents the implementation decisions in order: what each step
does, why it exists, where it is implemented, and how it is verified.

## 1. Choose one supported runtime

RevAudit's supported local path is:

```text
frontend (React/Vite)  ->  backend/main.py (FastAPI)  ->  GitHub REST API
                                             |
                                             ->  Neon PostgreSQL or local SQLite
```

Why: the original repository contained multiple experimental UI and backend
paths. Keeping one documented path makes local development and deployment
repeatable. `run-dev.sh` now launches this FastAPI service and this frontend.

Relevant files:

- `backend/main.py`
- `frontend/src/App.jsx`
- `run-dev.sh`
- `render.yaml`

## 2. Configure the backend

Copy `backend/.env.example` to `backend/.env` and set:

- `DATABASE_URL`: pooled Neon URL for application traffic, or the default local
  SQLite database during development.
- `GITHUB_TOKEN`: optional application token for higher unauthenticated API
  limits.
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_REDIRECT_URI`: the
  GitHub App Client ID, generated client secret, and registered callback URL.
- `GITHUB_OAUTH_SCOPE`: OAuth App scopes. Leave it blank for a GitHub App,
  because GitHub App permissions come from the App registration form.
- `SESSION_SECRET`: a long random secret used to sign the browser session.
- `FRONTEND_URL`: the exact frontend origin allowed by CORS and OAuth redirects.
- `GITHUB_MAX_PAGES`: maximum PR pages fetched per audit.
- `GITHUB_REVIEW_MAX_PRS`: maximum merged PRs whose review history is fetched in
  one request.

For the frontend, `frontend/.env.example` documents `VITE_API_BASE_URL`. Vite
development defaults to `http://localhost:8000`; production builds should set
the deployed FastAPI origin.

Why: secrets and deployment-specific URLs must not be committed to source, and
bounded ingestion prevents a large repository from turning one browser request
into an unbounded API job.

## 3. Create or upgrade the database schema

`backend/models.py` defines repositories, users, pull requests, review events,
and encrypted OAuth sessions. `backend/database.py` calls `ensure_schema()` to
create fresh tables and add the Phase 2 columns to an existing prototype
database.

Why: pagination and workload analysis require historical PR and review-event
records; OAuth requires a server-side session record so the access token is not
placed in the browser cookie.

Initialize explicitly when needed:

```bash
cd backend
python init_db.py
```

For Neon, use a direct connection for schema/migration work and a pooled URL
for normal application traffic. The application preserves SQLAlchemy as the
existing ORM.

## 4. Authenticate through GitHub OAuth

The flow is:

1. The frontend sends the user to `GET /auth/github/login`.
2. The backend creates a random OAuth `state` value and redirects to GitHub.
3. GitHub returns to `GET /auth/github/callback`.
4. The backend validates `state`, exchanges the code for an access token, and
   retrieves the GitHub profile.
5. The profile is upserted into `users`.
6. The access token is encrypted server-side and stored in `auth_sessions`.
7. The browser receives only a signed session identifier.
8. `GET /api/auth/me` restores the frontend user badge; logout deletes the
   server-side session.

Why: OAuth lets the application use a user's GitHub permissions for private or
rate-limited repositories without exposing the access token to React. The
`state` check prevents login-CSRF/callback substitution.

Relevant files:

- `backend/main.py`
- `backend/auth.py`
- `backend/models.py`
- `frontend/src/components/TopHeader.jsx`
- `frontend/src/lib/api.js`

The callback must be registered in the GitHub OAuth application as:

```text
http://localhost:8000/auth/github/callback
```

Use the deployed backend callback URL in production.

## 5. Ingest all available PR pages

`backend/github_client.py` follows GitHub's `Link` response header and fetches
up to `GITHUB_MAX_PAGES` pages at 100 records per page. The audit endpoint sorts
by `updated`, so an already-synced repository stops when it reaches the stored
sync timestamp.

Why: the original prototype read only the first 30 closed PRs. Pagination makes
the sample larger and lets historical baselines represent more than the latest
page while the sync timestamp avoids reprocessing the full history each time.

The client handles:

- 404 repository errors
- 401 expired OAuth tokens
- 403/rate-limit errors
- network failures
- malformed/non-list responses

## 6. Persist audits and ingest webhooks

The analysis endpoint is stateless, so a completed audit is mirrored into the
database after the response is sent. `backend/persistence.py` upserts the
repository, authors, reviewers, pull requests, and review events; repeated
persistence is idempotent by PR number and review identity. Set
`PERSIST_AUDITS=false` to disable the mirror.

`POST /api/webhook/github` verifies `X-Hub-Signature-256` with
`GITHUB_WEBHOOK_SECRET`, acknowledges the delivery immediately, and schedules
`pull_request.closed` ingestion with FastAPI's native `BackgroundTasks`.
`backend/webhooks.py` fetches the PR detail, timeline, and reviews with
`GITHUB_TOKEN`, normalizes them with the same record builder as the audit
engine, and upserts the result.

`GET /api/history?owner=&repo=` returns the persisted mirror, including review
events and the workload-adjusted fields.

Why: webhooks avoid making the browser wait for a full audit and keep a
historical record for later comparisons.

Relevant files:

- `backend/persistence.py`
- `backend/webhooks.py`
- `backend/main.py`

## 7. Calculate reviewer workload

Two complementary measures are reported:

1. **Recent activity proxy** (`reviewer_activity_7d`): the number of sampled
   human review events submitted by the eventual first reviewer in the seven
   days before the first review.
2. **Active queue at creation** (`reviewer_queue_at_creation`): other sampled
   PRs that were still open at this PR's ready-for-review time and already had
   an explicit `review_requested` timeline event for the eventual first
   reviewer.

The workload-adjusted rule is:

```text
Dynamic_Threshold = 1.5 + (0.15 × active_prs_in_queue)
```

The rule is applied per cohort median and exported as `workload_engine` and
`workload_anomalies`. It is additive to the robust residual model, so both
signals remain visible. `request_coverage_pct` states how many evaluated PRs
had explicit review-request evidence; low coverage is surfaced as a warning.

Why: raw review duration mixes complexity with queue pressure. The rule widens
allowances for busy reviewers while keeping the strict 1.5× baseline for empty
queues, without claiming access to GitHub's private assignment state.

## 8. Statistical model

`backend/statistical_engine.py` is the source of truth:

1. Build one record per sampled PR, preserving open and closed-unmerged PRs as
   right-censored observations.
2. Exclude bot authors from cohort and model estimates.
3. Classify by changed lines and files (Small/Medium/Large/Unknown).
4. Estimate cohort medians with Kaplan–Meier and a percentile bootstrap 95%
   interval when at least 10 records and 5 events are available.
5. Fit a Huber robust regression of `log1p(first-review hours)` on churn, files,
   first-time contributor status, and prior-7-day reviewer activity.
6. Flag `|robust z| ≥ 2.5` as a process triage signal in either direction.
7. Apply the workload-adjusted ratio threshold as a second, independent signal.

Both signals are triage aids, not quality or performance judgments.

## 9. Export a PDF audit report

The frontend can post the current audit payload to `POST /api/reports/pdf`.
`backend/reporting.py` renders:

- repository and audit metadata
- PR / merged / first-review / censoring counts
- size-controlled baseline matrix with 95% intervals
- robust adjusted triage signals
- workload-adjusted threshold matrix
- workload snapshot and interpretation notes

The manager dashboard also offers a browser-native print path using
`@media print`, which hides application chrome and renders the report on a white
sheet. The ReportLab endpoint remains available for payload-based downloads.

Why: managers and reviewers need a portable artifact that preserves the exact
analysis shown in the dashboard.

The report uses ReportLab and is downloaded by the browser as
`RevAudit_<owner>_<repo>.pdf`.

## 10. Run and verify

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd ..
./run-dev.sh
```

The API is available at `http://localhost:8000/docs` and the UI at
`http://localhost:5173`.

The feature smoke checks cover:

- Link-header pagination and sync stopping
- audit persistence idempotency and historical reads
- webhook HMAC verification and event filtering
- workload-adjusted threshold arithmetic and queue reconstruction
- encrypted OAuth session creation/resolution/revocation
- PDF output for both v2 and legacy payloads
- frontend production build and route rendering

## 11. Current limitations

- OAuth requires a real GitHub OAuth application and deployment secrets.
- Review workload is an inferred queue proxy, not GitHub's private assignment
  state. `request_coverage_pct` reports how much explicit review-request
  evidence was available.
- Webhook ingestion handles `pull_request.closed` only and uses `GITHUB_TOKEN`
  for follow-up REST calls; GitHub App installation tokens and delivery retries
  are not implemented.
- Review fetching is bounded by the audit `limit` and `GITHUB_REVIEW_MAX_PRS` to
  control API usage.
- Bootstrap intervals are shown only when cohort size and event support are
  sufficient; otherwise the estimate is explicitly marked unavailable.
- PDF export requires the ReportLab dependency from `backend/requirements.txt`.
- Local development defaults to SQLite; production should use the pooled Neon
  or Supabase PostgreSQL URL.

## 12. Role-based frontend routes

The frontend now uses `react-router-dom` with `HashRouter`, which keeps deep
links working on GitHub Pages without a server rewrite rule.

- `#/reviewer` — Smart Triage Queue. PRs are ordered Small → Medium → Large →
  Unknown, then oldest open item first. Small cohorts are pinned to encourage
  rapid unblocking.
- `#/contributor` — contributor lookup, currently active PRs, and the Complexity
  Coach. The coach warns when a draft description crosses the 1,000-character
  Large-cohort threshold.
- `#/manager` — print-ready manager report. `Print / Save as PDF` uses the
  browser print dialog; `@media print` hides navigation and renders the report
  on a white sheet.

`RequireAuth` guards the three role routes. It accepts a Supabase or backend
GitHub session, and offers an explicitly labelled, session-scoped demo mode when
OAuth credentials are not configured. Role selection is route-based; it does not
claim to enforce organisation-level authorization, which remains future work.

## 13. Deployment topology

Production runs the frontend on GitHub Pages and the API on Render:

- **Supabase**: GitHub OAuth provider, URL allowlist for
  `https://adityaraj868.github.io/revaudit/**`, and the Postgres database used by
  `DATABASE_URL`.
- **Render**: `render.yaml` service `revaudit-backend`; set `FRONTEND_URL` to the
  full Pages URL (`https://adityaraj868.github.io/revaudit`), `COOKIE_SECURE=true`,
  `GITHUB_WEBHOOK_SECRET`, and the Postgres connection string.
- **GitHub Pages**: `.github/workflows/deploy-frontend.yml` builds with
  `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and the
  `VITE_SUPABASE_ANON_KEY` repository secret. The workflow deploys from `main`.
- **Webhook**: `https://revaudit-backend.onrender.com/api/webhook/github` with
  the same secret used by Render.

See the Deployment section in `README.md` for the step-by-step setup.

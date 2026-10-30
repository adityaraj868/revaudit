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

## 6. Store review events

For merged PRs, the backend fetches `/pulls/{number}/reviews` and upserts each
review into `review_events`. The sync is idempotent by GitHub review ID, and
`reviews_synced_at` records which PRs have already been checked.

Why: pull-request metadata tells us when a PR merged, but it does not tell us
who reviewed it, when the first review happened, or how many review rounds took
place. Those values are required for workload analysis.

## 7. Calculate reviewer workload

For each review event, RevAudit counts the reviewer's other PRs that:

1. were previously reviewed by that reviewer, and
2. were still open when the current review was submitted.

The first review event on each merged PR supplies:

- first-review timestamp
- time to first review
- first reviewer
- concurrent workload snapshot
- total review count
- review rounds, represented by distinct review dates

Why: this is a transparent queue-congestion proxy. It avoids claiming that
GitHub's public review history is a perfect record of formal assignments while
still measuring whether a reviewer was carrying other active review work.

The response includes `workload_summary` with average workload, maximum
workload, sample size, review-event count, correlation with first-review delay,
and the fitted hours-per-concurrent-PR slope.

Relevant file: `backend/analytics.py`.

## 8. Preserve the size-controlled anomaly model

The existing statistical pipeline remains:

1. discard unmerged PRs from completed-review analysis;
2. calculate `merged_at - created_at` in hours;
3. classify by description length: Small, Medium, Large;
4. calculate a cohort median and mock 90% confidence interval;
5. flag review time above `1.5 × cohort median`.

Why: reviewer workload is an additional explanatory signal, not a reason to
remove the project's original size control. Keeping both fields in the payload
lets the UI and later modeling compare complexity and queue pressure together.

## 9. Export a PDF audit report

The frontend posts the current audit payload to `POST /api/reports/pdf`.
`backend/reporting.py` renders:

- repository summary
- merged/unmerged counts
- workload summary
- size-controlled baselines
- flagged anomaly table
- workload definition

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
- PR/review persistence and workload calculation
- encrypted OAuth session creation/resolution/revocation
- PDF output beginning with a valid `%PDF` header
- frontend production build

## 11. Current limitations

- OAuth requires a real GitHub OAuth application and deployment secrets.
- Review workload is an inferred queue proxy, not GitHub's private assignment
  state.
- Review fetching is bounded by `GITHUB_REVIEW_MAX_PRS` to control API usage.
- Confidence intervals retain the project's prototype “mock CI” calculation and
  should be replaced with a statistically validated estimator before production
  decisions.
- PDF export requires the ReportLab dependency from `backend/requirements.txt`.

# RevAudit (Team ArchCoders)

> **Academic Lab Project for Dr. Sukhpal Singh**  
> Analyzing GitHub Pull Request history to determine consistency in code review effort, controlling for PR size and reviewer workload.

---

## 🌟 Key Features
* **Statistically Controlled Review Baselines**: Segments pull requests into Small/Medium/Large/Unknown cohorts using changed lines and files, then estimates first-review latency with Kaplan–Meier medians and bootstrap 95% confidence intervals.
* **Outlier & Anomaly Detection**: Flags process signals using robust Huber residuals (\|z\| ≥ 2.5) and a workload-adjusted ratio threshold (`1.5 + 0.15 × active queue`).
* **Live Ingestion**: Paginates GitHub's REST API v3, enriches PRs with change stats and timeline events, keeps open/unreviewed PRs as right-censored observations, and handles rate limits.
* **Paginated Review History**: Follows GitHub Link headers, syncs review events, and mirrors completed audits into the relational database.
* **GitHub OAuth**: Optional sign-in stores the GitHub token encrypted server-side so private/restricted audits can use the user's permissions.
* **Webhook Ingestion**: A signed `POST /api/webhook/github` endpoint verifies HMAC-SHA256 and processes `pull_request.closed` events in a FastAPI BackgroundTask.
* **Historical Queries**: `GET /api/history` returns the persisted PR and review-event mirror for previous audits and webhook deliveries.
* **Reviewer Workload Analysis**: Reconstructs concurrent review queue pressure and reports its relationship to review delay, plus a dynamic workload-adjusted anomaly threshold.
* **PDF Reporting**: Exports the current audit payload, baselines, robust signals, workload-adjusted matrix, and workload summary as a downloadable PDF.
* **Role-Based Dashboards**: Protected `/reviewer`, `/contributor`, and `/manager` routes, with a session-scoped demo mode when GitHub OAuth is not configured locally.
* **Smart Triage Queue**: Reviewer work is ordered by size cohort, pinning Small PRs first to unblock teammates quickly.
* **Complexity Coach**: Contributors get live guidance on draft PR descriptions, warning above the 1,000-character Large-cohort threshold.
* **Print-Ready Manager Report**: A dedicated `@media print` stylesheet hides navigation and renders the size-stratified anomaly matrix on a clean white sheet, so PDFs can be produced by the browser print dialog.
* **Dual-View Web Interface**: Replaces PowerPoint slides with an interactive, responsive presentation deck alongside a live demo dashboard.
* **PlantUML Architecture Suite**: Includes 6 detailed sequence diagrams and a comprehensive domain class diagram.

---

## 📄 Formal Report

A complete, 38-page formal project report covering the problem statement,
statistical methodology, architecture, implementation, deployment, testing,
results, ethics, and future work:

- [Formal report — PDF](docs/RevAudit_Formal_Report.pdf)
- [Formal report — Markdown source](docs/FORMAL_REPORT.md)
- [Formal report — HTML](docs/FORMAL_REPORT.html)

---

## 🚀 Quickstart Guide

### 1. Backend (FastAPI & Statistical Engine)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in DATABASE_URL/OAuth values when using those features
uvicorn main:app --reload --port 8000
```
Backend API will be accessible at: `http://localhost:8000`  
Swagger / OpenAPI Docs: `http://localhost:8000/docs`

### 2. Frontend (React + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev
```
Frontend UI will be accessible at: `http://localhost:5173`

### 3. Full local launcher

From the repository root, `./run-dev.sh` starts the supported FastAPI + React
stack together. Configure `VITE_API_BASE_URL` only when the frontend should use
a backend other than the local `http://localhost:8000` during development.

### 4. Implementation walkthrough

The step-by-step explanation of what each stage does and why it exists is in
[`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md). It covers
OAuth, pagination, review-event ingestion, workload modeling, PDF export,
configuration, verification, and current limitations.

### 5. API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /auth/github/login` | Start GitHub OAuth |
| `GET /auth/github/callback` | Validate OAuth state and create the session |
| `GET /api/auth/me` | Return the current signed-in profile |
| `POST /api/auth/logout` | Revoke the server-side OAuth session |
| `GET /api/audit?owner=&repo=` | Paginate PRs, sync reviews, and calculate baselines/workload |
| `GET /api/history?owner=&repo=` | Read the persisted PR/review mirror |
| `POST /api/webhook/github` | Verify HMAC and ingest a closed PR in the background |
| `POST /api/reports/pdf` | Download a PDF for an audit payload |

### 6. Persistence & webhooks (Phase 2)

Completed audits are mirrored into `DATABASE_URL` (Neon/Supabase PostgreSQL in
deployment, SQLite locally) after the HTTP response is sent, using
`BackgroundTasks`. Set `PERSIST_AUDITS=false` to disable the mirror.

The backend deliberately keeps SQLAlchemy rather than adding the Supabase Python
SDK: the same models and queries work against the Supabase/Neon PostgreSQL URL,
local SQLite, and the existing OAuth tables, without a second database client.

`POST /api/webhook/github` requires `GITHUB_WEBHOOK_SECRET`. It verifies
`X-Hub-Signature-256`, acknowledges the event immediately, and processes
`pull_request.closed` in a background task: fetch PR detail, timeline, and
reviews from GitHub, normalize them, and upsert the repository, author,
reviewer, PR, and review-event rows. `GITHUB_TOKEN` is used for the follow-up
GitHub REST calls.

```bash
# GitHub webhook settings
Payload URL: https://<backend-host>/api/webhook/github
Content type: application/json
Secret:      same value as GITHUB_WEBHOOK_SECRET
Events:      Pull requests
```

### 7. Workload-adjusted thresholds (Phase 3)

The engine reconstructs each reviewer's active queue from explicit
`review_requested` timeline events: at a PR's ready-for-review time it counts
other sampled PRs that were still open and already waiting on that reviewer.
It then applies:

```text
Dynamic_Threshold = 1.5 + (0.15 × active_prs_in_queue)
```

Empty queues use the strict 1.5× cohort median; busier queues receive a wider
allowance. This is exported as `workload_engine` / `workload_anomalies` and is
reported **alongside** the robust Huber residual model, not as a replacement.
Review-request coverage is returned so low-coverage samples are explicit.

### 8. Role-based dashboards (Phase 4)

The frontend uses `react-router-dom` (`HashRouter`, so GitHub Pages deep links work) with these routes:

| Route | View |
|---|---|
| `#/` | Product landing page |
| `#/overview` | Repository overview and live audit metrics |
| `#/reviewer` | Smart Triage Queue (Small cohorts pinned first) |
| `#/contributor` | Contributor history, active PRs, and Complexity Coach |
| `#/manager` | Print-ready size-stratified anomaly matrix |
| `#/analysis`, `#/patterns`, `#/methodology`, `#/presentation`, `#/ethics` | Research, methodology, deck, and safeguards |

The three role dashboards are guarded by `RequireAuth`. When Supabase or backend
OAuth is configured, a GitHub identity unlocks them. For local demos without OAuth
credentials, the gate offers a session-scoped demo mode instead of exposing the
dashboards silently.

The Manager Report is exported with the browser's print dialog (`Print / Save as
PDF`). The `@media print` rules hide the sidebar, header, footer, and action
buttons, and render the report on a white sheet. The ReportLab endpoint remains
available for payload-based PDF downloads.

---

## ☁️ Deployment

Target production topology:

```
GitHub Pages (frontend)  ──►  Render (FastAPI)  ──►  GitHub REST API
        │                         │
        └── Supabase Auth         └── Supabase/Neon PostgreSQL
```

### 1. Supabase project

1. Create a project and copy the **Project URL** and **anon public key** from
   Project Settings → API.
2. Create a GitHub OAuth App at GitHub → Settings → Developer settings →
   OAuth Apps:
   - Homepage URL: your frontend URL (`https://adityaraj868.github.io/revaudit/`)
   - Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`
3. In Supabase → Authentication → Providers → GitHub, paste that OAuth App's
   Client ID and Client Secret. Do **not** use the Supabase project name or the
   database password here.
4. Authentication → URL Configuration:
   - Site URL: `https://adityaraj868.github.io/revaudit/`
   - Redirect URLs:
     - `http://localhost:5173/revaudit/**`
     - `https://adityaraj868.github.io/revaudit/**`
5. Database: reset/copy the database password, then build a pooled connection
   string. Use the **Session pooler** for Render:
   ```text
   postgresql://postgres.<project-ref>:<db-password>@<region>.pooler.supabase.com:5432/postgres?sslmode=require
   ```
   URL-encode special characters in the password (`@` → `%40`).

### 2. Render backend

The service is defined in `render.yaml` (`revaudit-backend`, root `backend/`).
Set these environment variables in the Render dashboard:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase/Neon Postgres connection string |
| `GITHUB_TOKEN` | PAT used by webhook follow-up and unauthenticated audits |
| `FRONTEND_URL` | `https://adityaraj868.github.io/revaudit` (full URL, no trailing slash) |
| `SESSION_SECRET` | long random string |
| `COOKIE_SECURE` | `true` |
| `GITHUB_WEBHOOK_SECRET` | random string shared with the GitHub webhook |
| `PERSIST_AUDITS` | `true` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_REDIRECT_URI` | only if using the backend OAuth fallback instead of Supabase Auth |

`FRONTEND_URL` is used twice: CORS takes its origin
(`https://adityaraj868.github.io`), while redirects preserve the `/revaudit/`
path. Cross-site cookies switch to `SameSite=None` automatically when
`COOKIE_SECURE=true`.

Deploy the branch Render is configured to track (set it in the Render dashboard;
`render.yaml` does not pin a branch). The free tier cold-starts, which the UI
masks with the skeleton/toast.

### 3. GitHub Pages frontend

The workflow `.github/workflows/deploy-frontend.yml` builds `frontend/` and
publishes to Pages. It runs on `main`, so merge the deploy branch first.

Add one repository secret (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |

`VITE_SUPABASE_URL` and `VITE_API_BASE_URL` are set directly in the workflow.
Vite inlines env vars at build time, so changing them requires a new build. The
app uses `HashRouter` and `base: '/revaudit/'`, so Pages deep links work without
a 404 rewrite.

### 4. GitHub webhook

After Render deploys, add a repository webhook:

```text
Payload URL: https://revaudit-backend.onrender.com/api/webhook/github
Content type: application/json
Secret:       same value as GITHUB_WEBHOOK_SECRET
Events:       Pull requests
```

Verify with `GET /` on the backend and a test `ping` delivery in GitHub's webhook
settings.

### 5. Local configuration

Copy `backend/.env.example` → `backend/.env` and
`frontend/.env.example` → `frontend/.env`, then fill in the same values. Both
files are gitignored. For local-only work, omit Supabase auth variables and the
backend OAuth fallback will be used; without `DATABASE_URL` the backend uses
SQLite.

---

## 📊 PlantUML Diagrams
Located in `docs/diagrams/`:
1. `01_sequence_oauth.puml`: Contributor logging in via GitHub OAuth.
2. `02_sequence_audit_request.puml`: Frontend requesting a repo audit from FastAPI.
3. `03_sequence_github_fetch.puml`: Backend fetching and paginating data from GitHub REST API.
4. `04_sequence_pandas_baseline.puml`: Pandas engine calculating size-controlled baselines and flagging anomalies.
5. `05_sequence_pdf_export.puml`: User exporting final flagged analytics to a PDF report.
6. `06_class_diagram.puml`: Domain entity model (`User`, `Repository`, `PullRequest`, `ReviewEvent`, `StatisticalModel`).
7. `07_sequence_reviewer_workload.puml`: Review-event ingestion and reviewer queue workload calculation.

# RevAudit Phase 2: Production Upgrade Strategy

**Project:** RevAudit (Team ArchCoders)

**Objective:** Pragmatic transition from a stateless academic lab prototype to a production-ready, role-based enterprise application.

## Executive Summary

This document outlines a time-efficient, high-impact implementation plan for RevAudit's Phase 2 roadmap. To ensure feasibility, we are bypassing heavy infrastructure overhead (like standalone Redis/Celery clusters or complex machine learning models) in favor of managed services (Backend-as-a-Service), native framework features, and algorithmic heuristics.

## Phase 1: Authentication & Rate Limiting (The Foundation)

**Goal:** Authenticate users, identify roles, and permanently bypass the GitHub 60 requests/hour IP limit.

1. **Setup Authentication Provider:**

   * Create a Supabase project and enable the GitHub OAuth provider.

   * Configure scopes to request `repo` and `read:user` access.

2. **Frontend Login Integration (React):**

   * Install `@supabase/supabase-js`.

   * Replace the current landing page with a "Sign in with GitHub" OAuth trigger.

3. **Token Capture & Forwarding:**

   * On successful redirect, extract the `provider_token` (GitHub Access Token) from the active Supabase session.

   * Update all `fetch()` calls to the Render backend to include: `Authorization: Bearer <provider_token>`.

4. **Backend Rate Limit Unlock (FastAPI):**

   * Use FastAPI's `Header` dependency to catch the incoming bearer token.

   * Pass this token directly into the `requests.get()` headers when querying GitHub's REST API, instantly upgrading the rate limit to 5,000 requests/hour.

## Phase 2: Database & Async Webhooks (Persistence Layer)

**Goal:** Store historical PR data and eliminate HTTP timeouts using lightweight background processing.

1. **Provision Managed Database:**

   * Utilize the built-in PostgreSQL database provided by your existing Supabase project (zero DevOps required).

   * Create standard SQL tables for `users` and `pull_requests`.

2. **Connect Backend to Database:**

   * Install the `supabase` Python SDK in the FastAPI environment.

   * Initialize the client using the project URL and Service Role Key securely via environment variables.

3. **Implement Webhook Listener:**

   * Create a new `POST /api/webhook/github` endpoint to listen for real-time repository events.

4. **Native Asynchronous Processing:**

   * Instead of deploying Celery/Redis, utilize FastAPI's native `BackgroundTasks`.

   * When a `pull_request.closed` webhook is received, immediately return a `200 OK` to GitHub, and pass the data parsing and PostgreSQL insertion logic to the background task.

## Phase 3: The Workload Engine (Algorithmic Logic)

**Goal:** Upgrade the static 1.5× anomaly rule to account for reviewer fatigue without the overhead of training a Bayesian ML model.

1. **Calculate Active Queue:**

   * Update the Pandas engine to calculate the concurrency of open PRs assigned to a specific reviewer at the time a new PR is created.

2. **Apply Dynamic Weighted Multiplier:**

   * Replace the hardcoded anomaly threshold (`1.5 * Cohort_Median`) with a sliding algorithmic scale: `Dynamic_Threshold = 1.5 + (0.15 * active_prs_in_queue)`

3. **Threshold Evaluation:**

   * The Pandas engine evaluates PRs against this dynamic threshold. Empty queues enforce strict latency limits, while overloaded reviewers automatically receive widened baseline allowances.

## Phase 4: Role-Based UI/UX (The Dashboards)

**Goal:** Restructure the single-page application into tailored experiences based on user identity.

1. **Route Architecture:**

   * Install `react-router-dom` and implement protected routes for `/contributor`, `/reviewer`, and `/manager`.

2. **UX Resilience (Render Cold Starts):**

   * Implement `<SkeletonLoader />` components across all dashboards. Display these loaders alongside a toast notification ("Waking up analysis engine...") to mask the 60-second Render free-tier cold start latency.

3. **The Contributor Dashboard:**

   * Display currently active PRs.

   * Implement a "Complexity Coach" UI that displays a visual warning if a drafted PR body crosses the 1,000-character (Large Cohort) threshold, suggesting the author break it down.

4. **The Reviewer Dashboard:**

   * Replace chronological lists with a "Smart Triage Queue."

   * Sort incoming PRs by RevAudit cohort, pinning "Small" (<250 char) PRs to the top of the queue to encourage rapid unblocking of teammates.

5. **The Manager Dashboard & Export Engine:**

   * Retain the existing size-stratified anomaly matrix.

   * Instead of building a heavy Python PDF compiler (e.g., ReportLab), implement a dedicated `@media print` CSS stylesheet. Ensure backgrounds print cleanly, removing navigation elements so managers can generate professional PDFs natively via the browser's print dialog.
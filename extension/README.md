# RevAudit Chrome Extension

A Manifest V3 popup for auditing GitHub pull request review latency. The
extension supports two access modes and two sign-in options:

| Mode | Login required | Repository access | GitHub API limit |
|---|---|---|---|
| **Public mode** | No | Public repositories | 60 requests/hour |
| **Signed-in mode** | Yes | Public and private repositories | 5,000 requests/hour |

Signed-in mode supports:

1. **GitHub OAuth Device Flow** — no client secret in the extension.
2. **Personal access token or OAuth token** — paste an existing token.

Analysis is performed by the RevAudit FastAPI backend, which returns
censoring-aware statistics and persists audits in PostgreSQL.

## Features

- Public repositories work without an account.
- Sign in for private repositories and the 5,000 req/hr limit.
- Detect `owner/repo` from the active GitHub tab.
- Kaplan–Meier cohort medians with bootstrap 95% confidence intervals.
- Robust Huber residual triage signals and workload-adjusted flags.
- Censored first-review counts and data-quality warnings.
- Reviewer workload summary and request coverage.
- Live GitHub rate-limit display and reset countdown.
- Persistent token/session storage via `chrome.storage.local`.
- Configurable analysis API (Render production or local FastAPI).

## Install (unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this `extension/` directory.

## Public mode

1. Click the RevAudit toolbar icon.
2. Open a public GitHub repository tab and click **Current Tab**, or type `owner/repo`.
3. Click **Audit Reviews**.

No login is required. The extension sends the audit request to the RevAudit API
without an `Authorization` header. The backend uses its configured
`GITHUB_TOKEN` if present, otherwise GitHub's unauthenticated limit applies and
the sample is capped at 25 PRs.

## Signed-in mode

### Option A — GitHub OAuth Device Flow (recommended)

This uses the public OAuth App client ID in `config.js`. No client secret is
stored in the extension and no backend token exchange is required.

**One-time operator setup:**

1. GitHub → Settings → Developer settings → OAuth Apps → your RevAudit app.
2. Enable **Device Flow** → **Update application**.
3. The bundled `config.js` contains the public client ID. To use a different
   OAuth App, edit `GITHUB_CLIENT_ID` or paste the Client ID in the auth drawer.

**User flow:**

1. Click the GitHub icon or **Sign in**.
2. Click **Sign In** under “Sign in with GitHub”.
3. Copy the displayed code.
4. Click **Open GitHub** and enter the code at `https://github.com/login/device`.
5. Authorize the scopes `repo read:user`.
6. Reopen the extension popup. It completes the exchange and shows your profile.

The popup can be closed while authorizing. The background service worker polls
GitHub and stores the token; reopening resumes polling if the worker was
suspended.

### Option B — Personal access token / OAuth token

1. Open the auth drawer → **Personal access token or OAuth token**.
2. Paste a GitHub PAT (classic or fine-grained) or an OAuth access token with
   `repo` scope.
3. Click **Connect**.

Private repositories require the token to have access to them.

## Analysis API

The extension calls:

```text
GET {API_BASE}/api/audit?owner=<owner>&repo=<repo>&limit=50
```

- `API_BASE` defaults to `https://revaudit-backend.onrender.com`.
- Change it in **Auth drawer → Analysis API**, or in `config.js`.
- For local development use `http://localhost:8000`.

The backend runs the censoring-aware engine (Kaplan–Meier, bootstrap intervals,
Huber residuals, workload thresholds) and mirrors the audit into PostgreSQL. The
extension handles both v2 payloads and legacy API payloads.

Users do **not** set up Supabase or a database. That is operator-side only.

## How it works

```text
Popup
  │  chrome.runtime.sendMessage
  ▼
Background service worker
  │  GitHub Device Flow → token + profile + rate limit
  ▼
chrome.storage.local (gh_auth)
  │
Popup ── GET /api/audit (optional Bearer token) ──► RevAudit API
                                                     │
                                                     ├─► GitHub REST API
                                                     └─► PostgreSQL
```

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Detect the repository in the current tab |
| `tabs` | Read the active tab URL and open the GitHub device page |
| `storage` | Persist auth state, API base, rate limits, last repo |
| `clipboardWrite` | Copy the device code |
| `host_permissions` | Call `github.com`, `api.github.com`, the Render API, and localhost |

The extension does not inject content scripts or modify GitHub pages.

## Security notes

- No GitHub client secret is embedded; Device Flow uses the public client ID.
- Tokens are stored in `chrome.storage.local`, isolated to the extension but
  readable by a compromised browser profile.
- Disconnecting removes the token from extension storage. It does not revoke it
  on GitHub; revoke it from GitHub settings if needed.
- The API receives the GitHub token only to query GitHub on your behalf; it is
  not stored in the database.
- Render's server `GITHUB_TOKEN` should have only `public_repo`. Private repos
  are accessed with the signed-in user's token, which takes precedence over the
  server token for that request.
- Public mode sends no credentials.

## Local development

1. Start the backend:
   ```bash
   cd ../backend
   ../.venv/bin/python -m uvicorn main:app --port 8000 --host 127.0.0.1
   ```
2. Load the extension unpacked.
3. Set **Analysis API** to `http://localhost:8000`.

No build step is required. Reload the extension after edits.

## Limitations

- The popup requests up to 50 PRs; the backend caps unauthenticated samples at 25.
- The Render free tier can cold-start for up to 60 seconds; the popup shows a
  wake-up message after four seconds.
- Private repositories require a `repo`-scoped token.
- GitHub Device Flow must be enabled on the OAuth App.
- The extension displays the API response; it does not run its own statistics.
- Legacy API deployments return the older 90% CI / 1.5× fields; the popup
  renders them for compatibility.
- There is no per-user role enforcement or extension-side history; persistence
  lives in the server database.

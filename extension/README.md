# RevAudit Chrome Extension

A Manifest V3 popup for auditing GitHub pull request review latency. It supports
two access modes and two sign-in options:

| Mode | Login required | Repository access | GitHub API limit |
|---|---|---|---|
| **Public mode** | No | Public repositories | 60 requests/hour |
| **Signed-in mode** | Yes | Public and private repositories | 5,000 requests/hour |

Signed-in mode signs in with GitHub OAuth. A personal access token is available
as an advanced fallback.

Analysis is performed by the RevAudit FastAPI backend, which returns
censoring-aware statistics and persists audits in PostgreSQL. Audits run in the
background service worker, so closing the popup does not cancel an in-progress
audit; reopen it to see progress or the completed result.

## Features

- Public repositories work without an account.
- One-click **Sign in with GitHub** for private repositories and 5,000 req/hr.
- Detect the repository link from the active GitHub tab.
- Kaplan–Meier cohort medians with bootstrap 95% confidence intervals.
- Robust Huber residual triage signals and workload-adjusted flags.
- Censored first-review counts and data-quality warnings.
- Reviewer workload summary and request coverage.
- Persistent token/session storage via `chrome.storage.local`.
- Configurable analysis API (Render production or local FastAPI).

## Install (unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this `extension/` directory.

The manifest contains a fixed public key, so the extension ID is stable:

```text
iomendeapkpepmlapflpdjnogjapccff
```

If you previously loaded an unpacked copy without the key, remove it and load
this version again — the ID and redirect URL change.

## Public mode

1. Click the RevAudit toolbar icon.
2. Open a public GitHub repository tab and click **Current Tab**, or paste its link.
3. Click **Audit Reviews**.

No login is required. The extension calls the RevAudit API without an
`Authorization` header. The backend uses its configured `public_repo` token, so
public audits still work within GitHub’s limits.

## Signed-in mode (OAuth)

1. Open the auth drawer and click **Sign in with GitHub**.
2. GitHub opens in an authorization window.
3. Approve the read-only scopes (`repo read:user`).
4. The window returns to the extension and the auth bar shows `@yourname`.

You can close the popup while GitHub is open; the background service worker
finishes the token exchange and stores the session. Reopen the popup to see it.

Chrome closes the extension popup when the GitHub authorization window takes
focus. If you cancel or close the GitHub window, reopen the extension: the auth
drawer shows the cancellation error and the toolbar icon gets a red `!` badge.
Starting sign-in again clears it.

### One-time operator setup

The extension uses GitHub’s OAuth web flow. The client secret stays on the
backend.

1. **GitHub OAuth App** → add this redirect URI:
   ```text
   https://iomendeapkpepmlapflpdjnogjapccff.chromiumapp.org/
   ```
2. **Render** → service `revaudit-backend` → Environment:
   ```text
   GITHUB_CLIENT_ID=<same client ID as extension/config.js>
   GITHUB_CLIENT_SECRET=<the OAuth App client secret>
   ```
3. Redeploy the backend so `POST /api/github/oauth/exchange` exists.

The extension sends the authorization code to the backend, which exchanges it
using the client secret and returns only the access token.

If sign-in says the endpoint is missing or not configured, either redeploy the
backend or use a personal access token.

## Advanced: personal access token

1. Open the auth drawer → **Use a personal access token instead**.
2. Paste a GitHub PAT (classic or fine-grained) or an OAuth access token with
   `repo` scope.
3. Click **Connect**.

Private repositories require the token to have access to them.

## Analysis API

```text
GET {API_BASE}/api/audit?owner=<owner>&repo=<repo>&limit=25
```

- Default: `https://revaudit-backend.onrender.com`
- Change in **Auth drawer → Advanced settings → Analysis API**
- Local: `http://localhost:8000`

The backend runs the censoring-aware engine and mirrors audits into PostgreSQL.
Users do **not** configure Supabase or a database.

## How it works

```text
Popup
  │  Sign in with GitHub
  ▼
Background service worker
  │  chrome.identity.launchWebAuthFlow → GitHub authorize
  │  POST /api/github/oauth/exchange    → access token (secret stays on server)
  │  GET  api.github.com/user + /rate_limit
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
| `tabs` | Read the active tab URL |
| `storage` | Persist auth state, API base, rate limits, last repo |
| `clipboardWrite` | Copy values when needed |
| `identity` | Launch the GitHub OAuth window and receive the redirect |
| `host_permissions` | Call GitHub, the Render API, and localhost |

The extension does not inject content scripts or modify GitHub pages.

## Security notes

- No GitHub client secret is embedded; the backend performs the exchange.
- Tokens are stored in `chrome.storage.local`, isolated to the extension but
  readable by a compromised browser profile.
- Disconnecting removes the token from extension storage. It does not revoke it
  on GitHub; revoke it from GitHub settings if needed.
- The API receives the GitHub token only to query GitHub on your behalf; it is
  not stored in the database.
- Render’s server `GITHUB_TOKEN` should have only `public_repo`. Private repos
  use the signed-in user’s token, which takes precedence for that request.
- Public mode sends no credentials.

## Limitations

- The popup requests up to 25 PRs for a fast response.
- The Render free tier can cold-start for up to 60 seconds; the popup shows a
  wake-up message after four seconds.
- Private repositories require a `repo`-scoped user token.
- OAuth requires `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` on Render and the
  extension redirect URI on the GitHub OAuth App.
- The extension displays the API response; it does not run its own statistics.
- There is no per-user role enforcement or extension-side history; persistence
  lives in the server database.

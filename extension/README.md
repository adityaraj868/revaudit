# RevAudit Chrome Extension

A zero-dependency Manifest V3 extension for auditing GitHub pull request review
latency. It supports two modes:

| Mode | Login required | Repository access | GitHub API limit |
|---|---|---|---|
| **Public mode** | No | Public repositories only | 60 requests/hour |
| **Signed-in mode** | Yes | Public and private repositories | 5,000 requests/hour |

Signed-in mode supports two authentication options:

1. **GitHub OAuth Device Flow** — no client secret in the extension.
2. **Personal access token or OAuth token** — paste an existing token.

## Features

- Open the popup on any GitHub repository and detect `owner/repo` automatically.
- Work without an account for public repositories.
- Sign in for private repositories and the 5,000 req/hr rate limit.
- Live rate-limit display and reset countdown.
- Size cohorts: Small (<250 body chars), Medium (250–1000), Large (>1000).
- Median review turnaround and 90% confidence interval per cohort.
- Anomaly flags when a PR exceeds 1.5× its cohort median.
- Persistent token/session storage via `chrome.storage.local`.

## Install (unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this `extension/` directory.

## Public mode

1. Click the RevAudit toolbar icon.
2. Open a public GitHub repository tab and click **Current Tab**, or type `owner/repo`.
3. Click **Audit Reviews**.

No login, token, or database setup is required. The extension calls GitHub
directly and remains subject to the unauthenticated 60 requests/hour limit. If the
limit is exhausted, the popup tells you to sign in or wait for the reset.

## Signed-in mode

### Option A — GitHub OAuth Device Flow (recommended)

This uses the public OAuth App client ID in `config.js`. No client secret is
stored in the extension.

**One-time app setup (operator):**

1. Open GitHub → Settings → Developer settings → OAuth Apps → your RevAudit app.
2. Enable **Device Flow** and update the application.
3. If you use a different OAuth App, edit `GITHUB_CLIENT_ID` in `config.js` or
   paste its Client ID in the extension drawer.

**User flow:**

1. Click the GitHub icon or **Sign in**.
2. Click **Sign In** under “Sign in with GitHub”.
3. Copy the displayed code.
4. Click **Open GitHub** and enter the code at `https://github.com/login/device`.
5. Authorize the requested scopes (`repo read:user`).
6. Reopen the extension popup. It completes the token exchange and shows your
   GitHub profile.

The popup can be closed while authorizing. The background service worker polls
GitHub and stores the token when authorization completes. Reopening the popup
resumes polling if the service worker was suspended.

### Option B — Personal access token / OAuth token

1. Open the auth drawer → **Personal access token or OAuth token**.
2. Paste a GitHub PAT (classic or fine-grained) or an OAuth access token with
   `repo` scope.
3. Click **Connect**.

Use the built-in link to generate a classic token with the `repo` scope.

## How it works

```text
Popup
  │  chrome.runtime.sendMessage
  ▼
Background service worker
  │  POST github.com/login/device/code      → device_code + user_code
  │  poll github.com/login/oauth/access_token
  │  GET  api.github.com/user + /rate_limit → profile + limits
  ▼
chrome.storage.local  →  gh_auth { token, username, avatar_url, rate_limit }
  │
Popup → api.github.com/repos/:owner/:repo/pulls?state=closed&per_page=30
```

The audit then computes cohorts and 1.5× anomalies locally in the popup. No
RevAudit backend or database is required.

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Detect the repository in the current tab |
| `tabs` | Read the active tab URL and open the GitHub device page |
| `storage` | Persist auth state, rate limits, and the last repository |
| `clipboardWrite` | Copy the device code |
| `host_permissions` | Call `github.com` and `api.github.com` |

The extension does not inject content scripts or modify GitHub pages.

## Security notes

- No GitHub client secret is embedded; Device Flow uses the public client ID.
- Tokens are stored in `chrome.storage.local`, which is isolated to the extension
  but readable by a compromised browser profile.
- Disconnect removes the token from extension storage. It does not revoke the token
  on GitHub; revoke it from GitHub settings if needed.
- The PAT field accepts tokens with `repo` scope; use a fine-grained token limited
  to the repositories you need where possible.
- Public mode sends no credentials.

## Local development

No build step is required:

1. Edit files in `extension/`.
2. Reload the extension in `chrome://extensions` (the refresh icon).
3. Reopen the popup.

To use a different OAuth App, change `GITHUB_CLIENT_ID` in `config.js` or paste the
Client ID in the drawer. The app must have Device Flow enabled.

## Limitations

- The popup analyzes up to 30 closed PRs with one GitHub request; it does not
  paginate.
- Cohort and anomaly calculations use the extension’s legacy body-length heuristic
  and 1.5× rule. They are independent of the FastAPI v2 engine’s Kaplan–Meier and
  robust-regression model.
- Private repositories require a token with `repo` scope.
- There is no per-user backend, database, or history in this extension branch.
- GitHub Device Flow must be enabled on the OAuth App.
- If GitHub changes its API or device endpoints, update the extension.

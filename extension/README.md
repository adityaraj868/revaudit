# RevAudit Browser Extension

A Chrome/Edge (Manifest V3) extension that signs in with Supabase GitHub OAuth
and runs a RevAudit repository audit from the toolbar popup.

The extension is a thin client: authentication and the session live in the
extension, while statistical analysis and persistence remain on the existing
FastAPI + Supabase PostgreSQL backend.

## Features

- Supabase GitHub OAuth using PKCE and `chrome.identity.launchWebAuthFlow`
- 5,000 requests/hour GitHub access through the user's provider token
- Detects the repository in the active GitHub tab
- Manual `owner/repo` or GitHub URL input
- Cohort baselines (Small/Medium/Large/Unknown) with 95% intervals
- Robust triage signals and workload-adjusted flags
- Median first-review latency, censoring counts, and workload summary
- Links to PRs and the full RevAudit dashboard
- Configurable API base for local development
- Session persisted in `chrome.storage.local` and refreshed automatically

## Install (unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this `extension/` directory.
4. The manifest contains a fixed public `key`, so the extension ID is stable:
   **`iomendeapkpepmlapflpdjnogjapccff`**

## Supabase configuration

The extension redirect URL is:

```text
https://iomendeapkpepmlapflpdjnogjapccff.chromiumapp.org/supabase
```

Add it in Supabase:

**Authentication → URL Configuration → Redirect URLs**

Keep the existing web redirects as well:

```text
https://adityaraj868.github.io/revaudit/**
http://localhost:5173/revaudit/**
```

The GitHub OAuth App callback remains the Supabase callback:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

## Configuration

`config.js` is generated locally from `frontend/.env` and is gitignored. If it
does not exist:

```bash
cp config.example.js config.js
# edit SUPABASE_URL and SUPABASE_ANON_KEY
```

`config.js` contains only public values (project URL and anon/publishable key).
Do not put a service-role key in a browser extension.

The API base can also be changed from **Extension setup** in the popup:

```text
Production: https://revaudit-backend.onrender.com
Local:      http://localhost:8000
```

## Usage

1. Click the RevAudit toolbar icon.
2. **Sign in with GitHub** and authorize the read-only scopes.
3. Open a GitHub repository tab and click **Current tab**, or type `owner/repo`.
4. Choose a sample size and click **Analyze**.
5. Inspect baselines, signals, and workload; use **Open full dashboard** for the
   full site.

The first request after idle may take up to 60 seconds because the Render free
tier cold-starts. The popup shows a wake-up message after four seconds.

## How authentication works

1. The service worker creates a PKCE verifier and SHA-256 challenge.
2. `chrome.identity.launchWebAuthFlow` opens Supabase's GitHub authorize URL with
   the `chromiumapp.org` redirect.
3. Supabase returns an authorization code to the extension.
4. The service worker exchanges it at `/auth/v1/token?grant_type=pkce`.
5. The session (`access_token`, `refresh_token`, `provider_token`) is stored in
   `chrome.storage.local`.
6. Audits call the backend with `Authorization: Bearer <GitHub provider_token>`.
7. Expired sessions are refreshed with the refresh token; the original provider
   token is retained when a refresh response omits it.

Scopes requested: `repo read:user`.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Persist the Supabase session and API base |
| `tabs` | Read the active tab URL to detect `github.com/owner/repo` |
| `identity` | Launch the OAuth flow and receive the redirect |
| `host_permissions` | Call GitHub, Supabase, the Render API, and localhost |

The extension does not inject content scripts, read page content, or modify
GitHub. It only reads the active tab's URL.

## Local development

```bash
# Backend
cd ../backend
../.venv/bin/python -m uvicorn main:app --port 8000 --host 127.0.0.1

# Extension
# Set API base to http://localhost:8000 in Extension setup
# Then reload the extension in chrome://extensions
```

The backend must allow the extension origin. Chrome extensions with host
permissions can call the API without CORS, but if a browser blocks the request,
add the extension origin to the backend CORS settings or test with the production
API.

## Packaging

For a Chrome Web Store upload:

1. Bump `version` in `manifest.json`.
2. Zip the `extension/` directory (exclude `config.example.js` if desired).
3. Upload the zip in the Chrome Web Store developer dashboard.

For a self-hosted `.crx`, use **Pack extension** in `chrome://extensions` with
the private key corresponding to the manifest `key`. Keep that private key out of
the repository.

## Limitations

- V1 is a popup only; it does not inject a panel into GitHub PR pages.
- Role-based access is not enforced by the extension; any signed-in user can run
  audits.
- The provider token is stored in extension storage (like the web app's local
  storage); a compromised browser profile can read it.
- GitHub provider tokens can expire independently of the Supabase session. If the
  backend rejects the token, sign out and sign in again.
- The extension shows the latest audit in the popup; it does not keep an offline
  history. Use the full dashboard or `/api/history` for persistence.

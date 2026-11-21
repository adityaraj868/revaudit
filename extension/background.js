/**
 * RevAudit background service worker.
 *
 * Owns the GitHub OAuth web flow so it can continue even when the popup closes
 * while the user authorizes on GitHub. The client secret stays on the RevAudit
 * backend; the extension only receives the resulting access token.
 */

importScripts('config.js');

const AUTH_KEY = 'gh_auth';
const PENDING_KEY = 'revaudit_oauth_pending';
const STATE_KEY = 'revaudit_oauth_state';
const USER_URL = 'https://api.github.com/user';
const RATE_LIMIT_URL = 'https://api.github.com/rate_limit';

async function getApiBase() {
  const stored = await chrome.storage.local.get('api_base_url');
  return (
    stored.api_base_url ||
    (globalThis.REVAUDIT_CONFIG && globalThis.REVAUDIT_CONFIG.API_BASE_URL) ||
    'https://revaudit-backend.onrender.com'
  ).replace(/\/$/, '');
}

async function fetchRateLimit(token) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(RATE_LIMIT_URL, { headers });
    if (!response.ok) return null;
    const data = await response.json();
    const core = data.resources?.core || {};
    return { limit: core.limit, remaining: core.remaining, reset: core.reset };
  } catch {
    return null;
  }
}

async function buildAuth(token) {
  const response = await fetch(USER_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'GitHub rejected this token. Sign in again.'
        : `GitHub profile lookup failed (HTTP ${response.status}).`,
    );
  }
  const user = await response.json();
  return {
    token,
    username: user.login,
    avatar_url: user.avatar_url,
    name: user.name || user.login,
    rate_limit: await fetchRateLimit(token),
  };
}

async function startOAuth() {
  const config = globalThis.REVAUDIT_CONFIG || {};
  const clientId = config.GITHUB_CLIENT_ID;
  if (!clientId) throw new Error('GitHub OAuth client ID is not configured.');

  const redirectUri = chrome.identity.getRedirectURL();
  const state = crypto.randomUUID();
  await chrome.storage.session.set({
    [STATE_KEY]: state,
    [PENDING_KEY]: true,
  });

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', config.GITHUB_OAUTH_SCOPES || 'repo read:user');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('allow_signup', 'true');

  let redirectUrl;
  try {
    redirectUrl = await chrome.identity.launchWebAuthFlow({
      url: authorizeUrl.toString(),
      interactive: true,
    });
  } catch {
    await chrome.storage.session.remove([STATE_KEY, PENDING_KEY]);
    throw new Error('GitHub sign-in was cancelled.');
  }
  if (!redirectUrl) {
    await chrome.storage.session.remove([STATE_KEY, PENDING_KEY]);
    throw new Error('GitHub sign-in was cancelled.');
  }

  const parsed = new URL(redirectUrl);
  const returnedState = parsed.searchParams.get('state');
  if (!returnedState || returnedState !== state) {
    await chrome.storage.session.remove([STATE_KEY, PENDING_KEY]);
    throw new Error('OAuth state validation failed. Please try again.');
  }
  const error = parsed.searchParams.get('error_description') || parsed.searchParams.get('error');
  if (error) {
    await chrome.storage.session.remove([STATE_KEY, PENDING_KEY]);
    throw new Error(error);
  }
  const code = parsed.searchParams.get('code');
  if (!code) {
    await chrome.storage.session.remove([STATE_KEY, PENDING_KEY]);
    throw new Error('GitHub did not return an authorization code.');
  }

  const apiBase = await getApiBase();
  const response = await fetch(`${apiBase}/api/github/oauth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    await chrome.storage.session.remove([STATE_KEY, PENDING_KEY]);
    if (response.status === 503) {
      throw new Error(
        'GitHub sign-in is not configured on the server yet. Use a personal access token, or ask the operator to set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.',
      );
    }
    if (response.status === 404) {
      throw new Error(
        'The GitHub sign-in endpoint is not deployed yet. Use a personal access token, or redeploy the latest backend.',
      );
    }
    throw new Error(payload.detail || 'GitHub sign-in failed.');
  }
  if (!payload.access_token) {
    await chrome.storage.session.remove([STATE_KEY, PENDING_KEY]);
    throw new Error('The server did not return a GitHub token.');
  }

  const auth = await buildAuth(payload.access_token);
  await chrome.storage.local.set({ [AUTH_KEY]: auth });
  await chrome.storage.session.remove([STATE_KEY, PENDING_KEY]);
  await chrome.action.setBadgeText({ text: '' });
  return auth;
}

async function getState() {
  const stored = await chrome.storage.local.get(AUTH_KEY);
  return {
    auth: stored[AUTH_KEY] || null,
    apiBaseUrl: await getApiBase(),
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case 'START_OAUTH':
        return { auth: await startOAuth() };
      case 'GET_AUTH_STATE':
        return await getState();
      case 'VERIFY_TOKEN':
        return { auth: await buildAuth(message.token) };
      default:
        throw new Error('Unknown background action.');
    }
  })()
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
  return true;
});

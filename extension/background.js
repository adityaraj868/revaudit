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
const ERROR_KEY = 'revaudit_oauth_error';
const AUDIT_KEY = 'revaudit_audit';
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
  await chrome.storage.session.remove([STATE_KEY, PENDING_KEY, ERROR_KEY]);
  await chrome.action.setBadgeText({ text: '' });
  await chrome.action.setTitle({ title: 'RevAudit' });
  return auth;
}

async function getAuditState() {
  const stored = await chrome.storage.local.get(AUDIT_KEY);
  const state = stored[AUDIT_KEY] || null;
  if (
    state &&
    state.status === 'loading' &&
    state.startedAt &&
    Date.now() - state.startedAt > 180_000
  ) {
    state.status = 'error';
    state.error = 'The audit timed out. Try again.';
    state.completedAt = Date.now();
    await chrome.storage.local.set({ [AUDIT_KEY]: state });
  }
  return state;
}

async function finishAudit(id, patch) {
  const stored = await chrome.storage.local.get(AUDIT_KEY);
  const current = stored[AUDIT_KEY];
  if (!current || current.id !== id) return;
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [AUDIT_KEY]: next });
  chrome.runtime.sendMessage({ type: 'AUDIT_UPDATE', state: next }).catch(() => null);
  if (next.status === 'done') {
    const count = next.data?.anomalies_count ?? next.data?.anomalies?.length ?? 0;
    await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#f97316' });
  }
}

async function runAudit(state) {
  let timeout;
  try {
    const stored = await chrome.storage.local.get(AUTH_KEY);
    const auth = stored[AUTH_KEY];
    const token = auth && auth.token ? auth.token : null;
    const apiBase = await getApiBase();
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const url = `${apiBase}/api/audit?owner=${encodeURIComponent(state.owner)}&repo=${encodeURIComponent(state.repo)}&limit=${state.limit}`;
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 180_000);

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.detail || `RevAudit API failed (HTTP ${response.status}).`);
    }
    await finishAudit(state.id, {
      status: 'done',
      data: payload,
      error: null,
      completedAt: Date.now(),
    });
  } catch (error) {
    await finishAudit(state.id, {
      status: 'error',
      error:
        error.name === 'AbortError'
          ? 'The audit timed out. Try again.'
          : error.message || 'Audit failed.',
      completedAt: Date.now(),
    });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function startAudit({ owner, repo, limit }) {
  if (!owner || !repo) throw new Error('A repository is required.');
  const state = {
    id: crypto.randomUUID(),
    status: 'loading',
    owner,
    repo,
    slug: `${owner}/${repo}`,
    limit: Math.min(200, Math.max(1, Number(limit) || 25)),
    startedAt: Date.now(),
    completedAt: null,
    data: null,
    error: null,
  };
  await chrome.storage.local.set({
    [AUDIT_KEY]: state,
    last_repo: { owner, repo },
  });
  runAudit(state).catch(() => null);
  return state;
}

async function recordOAuthError(message) {
  await chrome.storage.session.set({
    [ERROR_KEY]: { message, at: Date.now() },
  });
  await chrome.storage.session.remove(PENDING_KEY);
  await chrome.action.setBadgeText({ text: '!' });
  await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  await chrome.action.setTitle({ title: 'RevAudit — GitHub sign-in failed' });
}

async function clearOAuthError() {
  await chrome.storage.session.remove(ERROR_KEY);
  await chrome.action.setBadgeText({ text: '' });
  await chrome.action.setTitle({ title: 'RevAudit' });
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
        try {
          return { auth: await startOAuth() };
        } catch (error) {
          await recordOAuthError(error.message || 'GitHub sign-in failed.');
          throw error;
        }
      case 'CLEAR_OAUTH_ERROR':
        await clearOAuthError();
        return {};
      case 'RUN_AUDIT':
        return { state: await startAudit(message) };
      case 'GET_AUDIT':
        return { state: await getAuditState() };
      case 'CLEAR_AUDIT':
        await chrome.storage.local.remove(AUDIT_KEY);
        await chrome.action.setBadgeText({ text: '' });
        return {};
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

/**
 * RevAudit background service worker.
 *
 * Owns the GitHub OAuth Device Flow so authorization can continue even if the
 * popup closes while the user visits github.com/login/device.
 */

const DEVICE_KEY = 'gh_device_flow';
const AUTH_KEY = 'gh_auth';
const DEFAULT_SCOPES = 'repo read:user';
const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';
const RATE_LIMIT_URL = 'https://api.github.com/rate_limit';

let pollTimer = null;
let pollInFlight = false;

async function readDeviceState() {
  const stored = await chrome.storage.local.get(DEVICE_KEY);
  return stored[DEVICE_KEY] || null;
}

async function writeDeviceState(state) {
  if (state) await chrome.storage.local.set({ [DEVICE_KEY]: state });
  else await chrome.storage.local.remove(DEVICE_KEY);
}

async function fetchRateLimit(token) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(RATE_LIMIT_URL, { headers });
    if (!response.ok) return null;
    const data = await response.json();
    const core = data.resources?.core || {};
    return {
      limit: core.limit,
      remaining: core.remaining,
      reset: core.reset,
    };
  } catch {
    return null;
  }
}

async function buildAuth(token) {
  const userResponse = await fetch(USER_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!userResponse.ok) {
    throw new Error(
      userResponse.status === 401
        ? 'GitHub rejected the token. Please sign in again.'
        : `GitHub profile lookup failed (HTTP ${userResponse.status}).`,
    );
  }
  const user = await userResponse.json();
  return {
    token,
    username: user.login,
    avatar_url: user.avatar_url,
    name: user.name || user.login,
    rate_limit: await fetchRateLimit(token),
  };
}

async function startDeviceFlow(clientId, scopes) {
  if (!clientId) throw new Error('A GitHub OAuth App Client ID is required.');
  const response = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, scope: scopes || DEFAULT_SCOPES }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    if (data.error === 'device_flow_disabled') {
      throw new Error(
        'Device Flow is not enabled for this OAuth App. In GitHub: Settings → Developer settings → OAuth Apps → your app → enable “Device Flow”, then try again.',
      );
    }
    throw new Error(data.error_description || data.error || 'Could not start GitHub sign-in.');
  }

  const state = {
    client_id: clientId,
    device_code: data.device_code,
    user_code: data.user_code,
    verification_uri: data.verification_uri,
    interval: Number(data.interval) || 5,
    expires_at: Date.now() + (Number(data.expires_in) || 900) * 1000,
    status: 'pending',
    error: null,
    created_at: Date.now(),
  };
  await writeDeviceState(state);
  schedulePoll(state, state.interval * 1000);
  return state;
}

function schedulePoll(state, delayMs) {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(() => {
    pollTimer = null;
    pollDeviceFlow().catch(() => null);
  }, Math.max(1000, delayMs));
}

async function pollDeviceFlow() {
  if (pollInFlight) return readDeviceState();
  pollInFlight = true;
  try {
    const state = await readDeviceState();
    if (!state || state.status !== 'pending') return state;
    if (Date.now() > state.expires_at) {
      state.status = 'expired';
      state.error = 'The GitHub device code expired. Start sign-in again.';
      await writeDeviceState(state);
      return state;
    }

    state.last_poll_at = Date.now();
    await writeDeviceState(state);

    let data = {};
    try {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: state.client_id,
          device_code: state.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });
      data = await response.json().catch(() => ({}));
      if (!response.ok && !data.error) {
        throw new Error(`GitHub token request failed (HTTP ${response.status}).`);
      }
    } catch (error) {
      state.error = error.message || 'Network error while waiting for GitHub.';
      await writeDeviceState(state);
      schedulePoll(state, 10_000);
      return state;
    }

    if (data.access_token) {
      try {
        const auth = await buildAuth(data.access_token);
        await chrome.storage.local.set({ [AUTH_KEY]: auth });
        state.status = 'authorized';
        state.error = null;
        state.token_scope = data.scope || null;
        await writeDeviceState(state);
        await chrome.action.setBadgeText({ text: '✓' });
        await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
      } catch (error) {
        state.status = 'error';
        state.error = error.message;
        await writeDeviceState(state);
      }
      return state;
    }

    if (data.error === 'authorization_pending') {
      schedulePoll(state, (Number(state.interval) || 5) * 1000);
      return state;
    }
    if (data.error === 'slow_down') {
      state.interval = (Number(state.interval) || 5) + 5;
      await writeDeviceState(state);
      schedulePoll(state, state.interval * 1000);
      return state;
    }

    state.status = data.error === 'access_denied' ? 'denied' : 'error';
    state.error =
      data.error === 'access_denied'
        ? 'GitHub authorization was denied.'
        : data.error_description || data.error || 'GitHub authorization failed.';
    await writeDeviceState(state);
    return state;
  } finally {
    pollInFlight = false;
  }
}

async function resumePolling() {
  const state = await readDeviceState();
  if (state && state.status === 'pending' && !pollTimer && !pollInFlight) {
    const elapsed = Date.now() - (state.last_poll_at || 0);
    const remaining = (Number(state.interval) || 5) * 1000 - elapsed;
    schedulePoll(state, Math.max(1000, remaining));
  }
}

async function cancelDeviceFlow() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  await writeDeviceState(null);
  await chrome.action.setBadgeText({ text: '' });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case 'START_DEVICE_FLOW':
        return { state: await startDeviceFlow(message.clientId, message.scopes) };
      case 'GET_DEVICE_FLOW': {
        const state = await readDeviceState();
        if (state?.status === 'pending' && !pollTimer && !pollInFlight) {
          const elapsed = Date.now() - (state.last_poll_at || 0);
          const remaining = (Number(state.interval) || 5) * 1000 - elapsed;
          schedulePoll(state, Math.max(1000, remaining));
        }
        return { state };
      }
      case 'CANCEL_DEVICE_FLOW':
        await cancelDeviceFlow();
        return { state: null };
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

chrome.runtime.onStartup.addListener(() => {
  resumePolling().catch(() => null);
});

chrome.runtime.onInstalled.addListener(() => {
  resumePolling().catch(() => null);
});

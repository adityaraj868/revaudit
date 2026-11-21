import { CONFIG } from './config.js';

const SESSION_KEY = 'revaudit_session';
const REDIRECT_PATH = 'supabase';
const REFRESH_MARGIN_MS = 60_000;

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function getRedirectUri() {
  return chrome.identity.getRedirectURL(REDIRECT_PATH);
}

export async function createPkcePair() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64Url(new Uint8Array(digest));
  return { verifier, challenge };
}

export function buildAuthorizeUrl(challenge) {
  const url = new URL(`${CONFIG.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/authorize`);
  url.searchParams.set('provider', 'github');
  url.searchParams.set('redirect_to', getRedirectUri());
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('scopes', 'repo read:user');
  return url.toString();
}

function normaliseUser(user) {
  const meta = (user && user.user_metadata) || {};
  return {
    id: user?.id || null,
    login:
      meta.user_name ||
      meta.preferred_username ||
      meta.email ||
      user?.email ||
      'github-user',
    name: meta.full_name || meta.name || null,
    avatar_url: meta.avatar_url || null,
  };
}

function fromTokenPayload(payload, previous = null) {
  const expiresAt = payload.expires_at
    ? payload.expires_at * 1000
    : Date.now() + (Number(payload.expires_in) || 3600) * 1000;
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || previous?.refresh_token || null,
    expires_at: expiresAt,
    // Refresh responses may omit provider_token; keep the original GitHub token.
    provider_token: payload.provider_token || previous?.provider_token || null,
    user: payload.user ? normaliseUser(payload.user) : previous?.user || null,
  };
}

export async function readSession() {
  const stored = await chrome.storage.local.get(SESSION_KEY);
  return stored[SESSION_KEY] || null;
}

export async function saveSession(session) {
  await chrome.storage.local.set({ [SESSION_KEY]: session });
  return session;
}

export async function clearSession() {
  await chrome.storage.local.remove(SESSION_KEY);
}

function parseRedirect(resultUrl) {
  const url = new URL(resultUrl);
  const params = new URLSearchParams(url.search);
  if (!params.get('code') && url.hash) {
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    for (const [key, value] of hash.entries()) params.set(key, value);
  }
  return params;
}

export async function signIn() {
  const { verifier, challenge } = await createPkcePair();
  const authorizeUrl = buildAuthorizeUrl(challenge);

  const resultUrl = await chrome.identity.launchWebAuthFlow({
    url: authorizeUrl,
    interactive: true,
  });
  if (!resultUrl) throw new Error('Sign-in was cancelled.');

  const params = parseRedirect(resultUrl);
  const error = params.get('error_description') || params.get('error');
  if (error) throw new Error(error);
  const code = params.get('code');
  if (!code) throw new Error('Supabase did not return an authorization code.');

  const response = await fetch(
    `${CONFIG.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=pkce`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload.error_description || payload.msg || `Token exchange failed (${response.status}).`,
    );
  }
  return saveSession(fromTokenPayload(payload));
}

async function refreshSession(session) {
  if (!session?.refresh_token) return null;
  const response = await fetch(
    `${CONFIG.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    },
  );
  if (!response.ok) {
    await clearSession();
    return null;
  }
  const payload = await response.json().catch(() => ({}));
  if (!payload.access_token) {
    await clearSession();
    return null;
  }
  return saveSession(fromTokenPayload(payload, session));
}

export async function getValidSession({ forceRefresh = false } = {}) {
  const session = await readSession();
  if (!session) return null;
  if (!forceRefresh && session.expires_at - REFRESH_MARGIN_MS > Date.now()) {
    return session;
  }
  return refreshSession(session);
}

export async function signOut() {
  const session = await readSession();
  if (session?.access_token) {
    fetch(`${CONFIG.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: CONFIG.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }).catch(() => null);
  }
  await clearSession();
}

export function publicSession(session) {
  if (!session) {
    return {
      signedIn: false,
      user: null,
      redirectUri: getRedirectUri(),
    };
  }
  return {
    signedIn: true,
    user: session.user,
    redirectUri: getRedirectUri(),
    hasProviderToken: Boolean(session.provider_token),
    expiresAt: session.expires_at,
  };
}

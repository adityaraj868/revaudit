import { CONFIG } from './config.js';
import {
  getValidSession,
  publicSession,
  signIn,
  signOut,
} from './auth.js';

const RESERVED_OWNERS = new Set([
  'about', 'apps', 'codespaces', 'collections', 'customer-stories', 'dashboard',
  'explore', 'features', 'issues', 'join', 'login', 'marketplace', 'new',
  'notifications', 'organizations', 'orgs', 'pricing', 'pulls', 'search',
  'security', 'settings', 'sponsors', 'topics', 'trending', 'users',
]);

async function getApiBase() {
  const stored = await chrome.storage.sync.get('apiBaseUrl');
  return (stored.apiBaseUrl || CONFIG.API_BASE_URL).replace(/\/$/, '');
}

async function getState() {
  const session = await getValidSession();
  return {
    ...publicSession(session),
    apiBaseUrl: await getApiBase(),
    supabaseUrl: CONFIG.SUPABASE_URL,
    appUrl: CONFIG.APP_URL,
    defaultLimit: CONFIG.DEFAULT_LIMIT,
  };
}

function parseRepoInput(value) {
  if (!value) return null;
  const cleaned = String(value)
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^git@github\.com:/i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, repo] = parts;
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) return null;
  return { owner, repo };
}

async function activeRepo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  let url;
  try {
    url = new URL(tab.url);
  } catch {
    return null;
  }
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  if (RESERVED_OWNERS.has(parts[0].toLowerCase())) return null;
  return {
    owner: parts[0],
    repo: parts[1],
    slug: `${parts[0]}/${parts[1]}`,
  };
}

async function setBadge(count) {
  const text = Number.isFinite(Number(count)) && Number(count) > 0 ? String(count) : '';
  await chrome.action.setBadgeText({ text });
  if (text) {
    await chrome.action.setBadgeBackgroundColor({ color: '#f97316' });
  }
}

async function runAudit({ owner, repo, limit }) {
  const session = await getValidSession();
  if (!session) throw new Error('Sign in with GitHub first.');
  if (!session.provider_token) {
    throw new Error(
      'This session has no GitHub provider token. Sign out and sign in again to grant repository access.',
    );
  }
  const parsed = parseRepoInput(`${owner}/${repo}`);
  if (!parsed) throw new Error('Enter a repository as owner/repo or a GitHub URL.');

  const apiBase = await getApiBase();
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || CONFIG.DEFAULT_LIMIT));
  const url = `${apiBase}/api/audit?owner=${encodeURIComponent(parsed.owner)}&repo=${encodeURIComponent(parsed.repo)}&limit=${safeLimit}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          payload.detail || 'GitHub rejected this token. Sign out and sign in again.',
        );
      }
      if (response.status === 429) {
        throw new Error(
          payload.detail || 'GitHub rate limit reached. Sign in again or retry later.',
        );
      }
      throw new Error(payload.detail || `Audit failed with status ${response.status}.`);
    }
    await setBadge(payload.anomalies_count ?? payload.anomalies?.length ?? 0);
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function handle(message) {
  switch (message?.type) {
    case 'GET_STATE':
      return await getState();
    case 'SIGN_IN': {
      await signIn();
      return await getState();
    }
    case 'SIGN_OUT':
      await signOut();
      await setBadge(0);
      return await getState();
    case 'ACTIVE_REPO':
      return { repo: await activeRepo() };
    case 'AUDIT':
      return { data: await runAudit(message) };
    case 'SET_API_BASE': {
      const value = String(message.value || '').trim();
      if (!/^https?:\/\//i.test(value)) throw new Error('API URL must start with http:// or https://');
      await chrome.storage.sync.set({ apiBaseUrl: value.replace(/\/$/, '') });
      return { apiBaseUrl: await getApiBase() };
    }
    case 'OPEN_DASHBOARD':
      await chrome.tabs.create({ url: CONFIG.APP_URL });
      return { ok: true };
    default:
      throw new Error('Unknown extension action.');
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handle(message)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
  return true;
});

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get('apiBaseUrl');
  if (!stored.apiBaseUrl) {
    await chrome.storage.sync.set({ apiBaseUrl: CONFIG.API_BASE_URL });
  }
});

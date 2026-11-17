import { getStoredGitHubToken } from './supabase';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:8000'
    : 'https://revaudit-backend.onrender.com')
).replace(/\/$/, '');

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

/**
 * Returns fetch headers with Authorization: Bearer <provider_token> attached
 * when a GitHub provider token is active in the session.
 */
export function getAuthHeaders(existingHeaders = {}) {
  const headers = { ...existingHeaders };
  const token = getStoredGitHubToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const fetchOptions = {
  credentials: 'include',
};

/**
 * Convenience fetch wrapper that automatically forwards the GitHub provider token
 * in the Authorization header.
 */
export async function authenticatedFetch(pathOrUrl, options = {}) {
  const url = pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')
    ? pathOrUrl
    : apiUrl(pathOrUrl);

  const headers = getAuthHeaders(options.headers || {});

  return fetch(url, {
    ...fetchOptions,
    ...options,
    headers,
  });
}

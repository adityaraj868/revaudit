import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const GITHUB_TOKEN_KEY = 'revaudit_github_provider_token';

/**
 * Retrieve the stored GitHub provider token (OAuth access token).
 */
export function getStoredGitHubToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(GITHUB_TOKEN_KEY);
}

/**
 * Persist or clear the GitHub provider token in local storage.
 */
export function setStoredGitHubToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(GITHUB_TOKEN_KEY);
  }
}

/**
 * Trigger GitHub OAuth authentication with repo and read:user scopes.
 */
export async function signInWithGitHub() {
  if (!supabase) {
    console.warn(
      'Supabase is not configured with valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. ' +
      'Falling back to backend OAuth.'
    );
    window.location.assign('/auth/github/login');
    return;
  }

  // Redirect back to current origin without query params that could break redirect
  const redirectTo = window.location.origin + window.location.pathname;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: 'repo read:user',
      redirectTo,
    },
  });

  if (error) {
    console.error('Supabase GitHub OAuth error:', error);
    throw error;
  }
  return data;
}

/**
 * Sign out from Supabase and remove the stored GitHub provider token.
 */
export async function signOut() {
  setStoredGitHubToken(null);
  if (supabase) {
    await supabase.auth.signOut().catch(() => null);
  }
}

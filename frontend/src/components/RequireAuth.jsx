import React, { useState } from 'react';
import { Loader2, LogIn, ShieldCheck } from 'lucide-react';

const DEMO_MODE_KEY = 'revaudit_demo_mode';

function readDemoMode() {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(DEMO_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Route guard for the role dashboards.
 *
 * A real GitHub identity unlocks the route through either Supabase OAuth or the
 * backend OAuth session. Because GitHub is not always configured in local demos,
 * an explicit (and clearly labelled) session-scoped demo mode is offered instead
 * of silently exposing the dashboards.
 */
export default function RequireAuth({ authUser, checking, onLogin, role = 'role', children }) {
  const [demoMode, setDemoMode] = useState(readDemoMode);

  const enterDemoMode = () => {
    try {
      window.sessionStorage.setItem(DEMO_MODE_KEY, '1');
    } catch {
      // sessionStorage can be unavailable in private contexts; demo mode still
      // works for the current render in that case.
    }
    setDemoMode(true);
  };

  if (checking) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center" aria-busy="true" aria-live="polite">
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 text-xs text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
          <span>Checking your GitHub session…</span>
        </div>
      </div>
    );
  }

  if (authUser || demoMode) return children;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
          <ShieldCheck className="h-5 w-5" />
        </div>

        <h1 className="text-lg font-semibold text-white capitalize">
          Sign in to open the {role} dashboard
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Role dashboards are protected because they scope queues and contributor history to the
          signed-in GitHub identity. RevAudit requests read-only repository access and never posts
          on your behalf.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-orange-400"
          >
            <LogIn className="h-4 w-4" />
            Sign in with GitHub
          </button>
          <button
            type="button"
            onClick={enterDemoMode}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
          >
            Continue in demo mode
          </button>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          Demo mode is session-scoped and uses the sample or already-fetched audit data. It is meant
          for local demos where GitHub OAuth credentials are not configured.
        </p>
      </section>
    </div>
  );
}

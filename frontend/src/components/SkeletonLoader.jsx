import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Shared skeleton primitives used while the FastAPI engine is cold-starting
 * or while a repository audit is being paginated.
 */
export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-800/70 ${className}`} />;
}

export function DashboardSkeleton({ label = 'Loading analysis' }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={label}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-7 w-16" />
            <SkeletonBlock className="h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-44 w-full" />
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <SkeletonBlock className="h-4 w-48" />
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

export function QueueSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading triage queue">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-4">
            <SkeletonBlock className="h-4 w-2/3" />
            <SkeletonBlock className="h-6 w-20" />
          </div>
          <SkeletonBlock className="h-3 w-1/2" />
          <SkeletonBlock className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function ColdStartToast({ show }) {
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-orange-500/40 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur animate-fade-in"
    >
      <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-orange-400" />
      <div>
        <p className="text-xs font-semibold text-white">Waking up analysis engine…</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
          Free-tier backends can take up to 60 seconds to cold start. The dashboard will
          populate automatically when the audit finishes.
        </p>
      </div>
    </div>
  );
}

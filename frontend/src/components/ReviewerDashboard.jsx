import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Clock3,
  GitPullRequest,
  Layers,
  ListChecks,
  Pin,
  RefreshCw,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import PageHeader from './PageHeader';
import { ErrorState } from './States';
import { QueueSkeleton } from './SkeletonLoader';

const COHORT_RANK = { Small: 0, Medium: 1, Large: 2, Unknown: 3 };
const COHORT_STYLES = {
  Small: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  Medium: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  Large: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Unknown: 'border-slate-600 bg-slate-800 text-slate-300',
};

const EMPTY = [];

function hoursSince(value) {
  if (!value) return null;
  const created = new Date(value).getTime();
  if (!Number.isFinite(created)) return null;
  return Math.max(0, (Date.now() - created) / 3_600_000);
}

function formatDuration(hours) {
  if (hours == null || !Number.isFinite(Number(hours))) return '—';
  const value = Number(hours);
  if (value >= 48) return `${(value / 24).toFixed(1)} days`;
  return `${value.toFixed(1)} h`;
}

function sortByCohort(rows) {
  return [...rows].sort((left, right) => {
    const cohort = (COHORT_RANK[left.size_category] ?? 3) - (COHORT_RANK[right.size_category] ?? 3);
    if (cohort !== 0) return cohort;
    const openFirst = Number(Boolean(right.is_open)) - Number(Boolean(left.is_open));
    if (openFirst !== 0) return openFirst;
    return new Date(left.created_at || 0) - new Date(right.created_at || 0);
  });
}

export default function ReviewerDashboard({ auditData, currentRepo, loading, error, onRefresh }) {
  const [mode, setMode] = useState('queue');
  const records = auditData?.pull_requests ?? EMPTY;
  const workload = auditData?.workload_summary ?? {};

  const queue = useMemo(() => {
    const rows = records.filter((pr) => {
      if (mode === 'awaiting') return pr.first_review_observed !== true;
      if (mode === 'all') return true;
      return Boolean(pr.is_open) && pr.first_review_observed !== true;
    });
    return sortByCohort(rows);
  }, [records, mode]);

  const smallAwaiting = records.filter(
    (pr) => pr.size_category === 'Small' && pr.first_review_observed !== true,
  ).length;
  const awaitingCount = records.filter((pr) => pr.first_review_observed !== true).length;
  const oldestHours = queue.reduce((oldest, pr) => {
    const age = hoursSince(pr.created_at);
    return age != null && (oldest == null || age > oldest) ? age : oldest;
  }, null);

  if (loading && records.length === 0) return <QueueSkeleton />;
  if (error) return <ErrorState error={error} onRetry={onRefresh} />;
  if (records.length === 0) {
    return (
      <ErrorState
        error="This audit response does not include individual pull request records. Run a live audit with analysis version 2.0.0 to build the triage queue."
        onRetry={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Smart Triage Queue"
        subtitle={`Small changes are pinned first so teammates are unblocked quickly · ${currentRepo || 'selected repository'}`}
        badges={[
          { label: 'Reviewer View', color: 'bg-slate-800 text-slate-300 border-slate-700' },
          { label: 'Cohort-ordered', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
          { label: 'No performance ranking', color: 'bg-slate-800 text-slate-300 border-slate-700' },
        ]}
        actions={onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh queue
          </button>
        )}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Queue summary">
        <SummaryTile icon={ListChecks} label="Awaiting first review" value={awaitingCount} hint="Across the sampled PRs" />
        <SummaryTile icon={Pin} label="Small PRs pinned" value={smallAwaiting} hint="Fast unblock candidates" tone="emerald" />
        <SummaryTile icon={Clock3} label="Oldest queue item" value={formatDuration(oldestHours)} hint="Age since opened" />
        <SummaryTile
          icon={Users}
          label="Reviewer workload"
          value={Number(workload.average_concurrent_prs || 0).toFixed(1)}
          hint={`${workload.review_event_count || 0} review events sampled`}
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Queue ordering</h2>
            <p className="mt-1 text-xs text-slate-400">
              Cohort order is Small → Medium → Large → Unknown, then oldest open item first.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 p-1">
            <SlidersHorizontal className="ml-1.5 h-3.5 w-3.5 text-slate-500" />
            {[
              ['queue', 'Actionable queue'],
              ['awaiting', 'All awaiting'],
              ['all', 'All sampled'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  mode === value ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {queue.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-5 py-12 text-center">
          <GitPullRequest className="mx-auto mb-3 h-9 w-9 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-200">Queue is clear</h2>
          <p className="mt-1 text-sm text-slate-400">
            No sampled pull requests match this view. Try “All sampled” or refresh the audit.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {queue.map((pr, index) => (
            <QueueRow key={pr.pr_number} pr={pr} position={index + 1} />
          ))}
        </div>
      )}

      <p className="text-center text-[11px] leading-relaxed text-slate-500">
        The triage queue is an ordering aid for process work, not a judgment of code quality or
        reviewer performance. Small cohorts are promoted because their review cost is usually lower.
      </p>
    </div>
  );
}

function QueueRow({ pr, position }) {
  const age = hoursSince(pr.created_at);
  const cohortStyle = COHORT_STYLES[pr.size_category] || COHORT_STYLES.Unknown;
  const pinned = pr.size_category === 'Small';

  return (
    <article
      className={`rounded-xl border bg-slate-900 p-4 transition-colors hover:border-slate-700 ${
        pinned ? 'border-emerald-500/30' : 'border-slate-800'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-slate-500">{String(position).padStart(2, '0')}</span>
            <a
              href={pr.html_url}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-100 transition-colors hover:text-orange-300"
            >
              <span className="truncate">
                #{pr.pr_number} {pr.title}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className={`rounded-full border px-2 py-0.5 font-medium ${cohortStyle}`}>
              {pr.size_category} cohort
            </span>
            {pinned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                <Pin className="h-3 w-3" /> Pinned
              </span>
            )}
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300">
              @{pr.author}
            </span>
            {pr.is_draft && (
              <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-slate-300">Draft</span>
            )}
            {pr.is_first_time_contributor && (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-300">
                First-time contributor
              </span>
            )}
            {pr.is_anomaly && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-300">
                Adjusted triage signal
              </span>
            )}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-4 text-right sm:grid-cols-3">
          <Metric label="Age" value={formatDuration(age)} />
          <Metric
            label="First review"
            value={pr.first_review_observed ? formatDuration(pr.first_review_latency_hours) : 'Waiting'}
          />
          <Metric
            label="Model expected"
            value={pr.expected_first_review_hours != null ? formatDuration(pr.expected_first_review_hours) : '—'}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-800 pt-2.5 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3 w-3" />
          {pr.changed_lines != null ? `${pr.changed_lines} changed lines` : 'Size unavailable'}
        </span>
        <span>{pr.files_changed != null ? `${pr.files_changed} files` : 'files unavailable'}</span>
        <span>{pr.body_length != null ? `${pr.body_length} char description` : 'no description'}</span>
        {pr.reviewer_queue_at_creation != null && (
          <span>queue at creation: {pr.reviewer_queue_at_creation}</span>
        )}
        {pr.dynamic_threshold_ratio != null && (
          <span>workload threshold: {Number(pr.dynamic_threshold_ratio).toFixed(2)}×</span>
        )}
        {pr.is_workload_anomaly && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-300">
            Workload-adjusted signal
          </span>
        )}
        <span>{pr.censoring_status?.replaceAll('_', ' ') || pr.state}</span>
      </div>
    </article>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-xs text-slate-200">{value}</div>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'text-white',
    emerald: 'text-emerald-300',
  };
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div className={`mt-2 text-xl font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}

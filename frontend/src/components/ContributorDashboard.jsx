import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  GitPullRequest,
  Lightbulb,
  Scissors,
  Search,
  UserRound,
} from 'lucide-react';
import PageHeader from './PageHeader';
import { ErrorState } from './States';
import { DashboardSkeleton } from './SkeletonLoader';

const EMPTY_PULL_REQUESTS = [];

const formatDuration = (hours) => {
  if (hours == null || !Number.isFinite(Number(hours))) return 'Waiting / unavailable';
  hours = Number(hours);
  if (hours >= 48) return `${(hours / 24).toFixed(1)} days`;
  return `${hours.toFixed(1)} hours`;
};

const formatAge = (value) => {
  if (!value) return '—';
  const created = new Date(value).getTime();
  if (!Number.isFinite(created)) return '—';
  return formatDuration(Math.max(0, (Date.now() - created) / 3_600_000));
};

const medianOf = (values) => {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

export default function ContributorDashboard({ auditData, currentRepo, loading, error, onRefresh, authUser }) {
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const username = usernameTouched ? usernameInput : (authUser?.login || '');
  const updateUsername = (value) => {
    setUsernameTouched(true);
    setUsernameInput(value);
  };
  const allPullRequests = auditData?.pull_requests ?? EMPTY_PULL_REQUESTS;
  const isPartialSample = !Array.isArray(auditData?.pull_requests);

  const contributorPRs = useMemo(() => {
    const query = username.trim().replace(/^@/, '').toLowerCase();
    if (!query) return [];
    const rows = allPullRequests.length > 0 ? allPullRequests : (auditData?.anomalies || []);
    return rows
      .filter((pr) => (pr.author || '').toLowerCase() === query)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [allPullRequests, auditData, username]);

  if (loading) return <DashboardSkeleton label="Loading contributor analysis" />;
  if (error) return <ErrorState error={error} onRetry={onRefresh} />;

  const turnaroundValues = contributorPRs.filter((pr) => pr.first_review_latency_hours != null).map((pr) => Number(pr.first_review_latency_hours));
  const medianTurnaround = medianOf(turnaroundValues);
  const flaggedCount = contributorPRs.filter((pr) => pr.is_anomaly).length;
  const matchingFullSample = allPullRequests.filter((pr) => (pr.author || '').toLowerCase() === username.trim().replace(/^@/, '').toLowerCase()).length;
  const activePRs = contributorPRs.filter((pr) => pr.is_open);

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={`Contributor Dashboard${username.trim() ? `: @${username.trim().replace(/^@/, '')}` : ''}`}
        subtitle={`A personal view of first-review queue latency in ${currentRepo || 'the selected repository'}.`}
        badges={[
          { label: 'Contributor View', color: 'bg-slate-800 text-slate-300 border-slate-700' },
          { label: 'Open and closed PR sample', color: 'bg-slate-800 text-slate-300 border-slate-700' },
        ]}
        actions={onRefresh && (
          <button onClick={onRefresh} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700">
            Refresh repository data
          </button>
        )}
      />

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
        <label htmlFor="contributor-username" className="mb-2 block text-sm font-medium text-slate-200">Your GitHub username</label>
        <div className="flex max-w-xl items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 focus-within:border-orange-400">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            id="contributor-username"
            value={username}
            onChange={(event) => updateUsername(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }}
            placeholder="e.g. octocat"
            autoComplete="off"
            className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">Enter the exact GitHub username used as the PR author. This search stays in your browser.</p>
      </section>

      {isPartialSample && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200">
          This API response does not include the sampled pull request records, so contributor history is incomplete.
        </div>
      )}

      <ComplexityCoach />

      {!username.trim() ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-5 py-10 text-center">
          <UserRound className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-200">Look up your contribution history</h2>
          <p className="mt-1 text-sm text-slate-400">Enter your GitHub username to see pull requests and their first-review latency.</p>
        </div>
      ) : contributorPRs.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-10 text-center">
          <GitPullRequest className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-200">No sampled PRs found for @{username.trim().replace(/^@/, '')}</h2>
          <p className="mt-1 text-sm text-slate-400">Check the spelling or choose another repository.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard icon={GitPullRequest} label="PRs in sample" value={contributorPRs.length} hint={isPartialSample ? 'Partial sample' : 'Recent repository sample'} />
            <SummaryCard icon={Clock3} label="Median first-review latency" value={formatDuration(turnaroundValues.length ? medianTurnaround : null)} hint="Time to first human review" />
            <SummaryCard icon={AlertTriangle} label="Triage signals" value={`${flaggedCount} / ${contributorPRs.length}`} hint="Adjusted process residuals" tone={flaggedCount ? 'amber' : 'emerald'} />
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Currently active PRs</h2>
              <p className="mt-1 text-xs text-slate-400">
                Open pull requests authored by @{username.trim().replace(/^@/, '')} in this sample.
              </p>
            </div>
            {activePRs.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-400">
                No open PRs were found for this contributor in the sampled window.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                {activePRs.map((pr) => {
                  const awaiting = pr.first_review_observed !== true;
                  return (
                    <a
                      key={pr.pr_number}
                      href={pr.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-lg border border-slate-800 bg-slate-950 p-3 transition-colors hover:border-orange-500/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-100 group-hover:text-orange-300">
                          #{pr.pr_number} {pr.title}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-orange-300" />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300">
                          {pr.size_category} cohort
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 ${
                            awaiting
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          }`}
                        >
                          {awaiting ? 'Awaiting first review' : 'In review'}
                        </span>
                        {pr.is_draft && (
                          <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-slate-300">Draft</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span>Open for {formatAge(pr.created_at)}</span>
                        <span>{pr.changed_lines != null ? `${pr.changed_lines} lines` : 'size unavailable'}</span>
                        <span>{pr.body_length != null ? `${pr.body_length} char description` : 'no description'}</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Your pull requests</h2>
              <p className="mt-1 text-xs text-slate-400">Open PRs without a first review are right-censored at audit time. Signals describe process patterns, not contributor performance.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Pull request</th>
                    <th className="px-4 py-3 font-medium">Size cohort</th>
                    <th className="px-4 py-3 text-right font-medium">First review latency</th>
                    <th className="px-4 py-3 text-right font-medium">Model expected</th>
                    <th className="px-4 py-3 font-medium">Comparison</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {contributorPRs.map((pr) => {
                    const hours = pr.first_review_latency_hours;
                    const median = pr.expected_first_review_hours;
                    const flagged = Boolean(pr.is_anomaly);
                    return (
                      <tr key={pr.pr_number} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <a href={pr.html_url} target="_blank" rel="noreferrer" className="flex max-w-[420px] items-center gap-1.5 font-medium text-slate-200 hover:text-orange-300">
                            <span className="truncate">#{pr.pr_number} {pr.title}</span>
                            <ArrowUpRight className="h-3 w-3 shrink-0" />
                          </a>
                          <span className="mt-1 block text-[11px] text-slate-500">{pr.state} · {pr.censoring_status?.replaceAll('_', ' ')}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{pr.size_category}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200">{formatDuration(hours)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-400">{formatDuration(median)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-1 text-[11px] ${flagged ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
                            {flagged ? `${pr.anomaly_direction?.replaceAll('_', ' ')} (triage)` : pr.first_review_observed ? 'No adjusted signal' : 'Censored / awaiting review'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {username.trim() && matchingFullSample > 0 && (
        <p className="text-center text-xs text-slate-500">These comparisons describe repository process patterns and are not a measure of individual performance.</p>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'text-white',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
  };
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span><Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div className={`mt-2 text-xl font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}

const SMALL_BODY_LIMIT = 250;
const LARGE_BODY_LIMIT = 1000;

function ComplexityCoach() {
  const [draft, setDraft] = useState('');
  const length = draft.length;
  const isLarge = length > LARGE_BODY_LIMIT;
  const isMedium = !isLarge && length >= SMALL_BODY_LIMIT;
  const progress = Math.min(100, (length / LARGE_BODY_LIMIT) * 100);
  const zone = isLarge ? 'Large' : isMedium ? 'Medium' : 'Small';

  const zoneStyle = isLarge
    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
    : isMedium
      ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Lightbulb className="h-4 w-4 text-orange-400" />
            Complexity Coach
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            Draft your pull request description here. Descriptions above the 1,000-character
            Large-cohort threshold tend to package several changes together and are slower to review.
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${zoneStyle}`}>
          {zone} draft
        </span>
      </div>

      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={4}
        placeholder="Paste or draft your PR body: problem, approach, testing, and any follow-ups…"
        className="mt-3 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-orange-400"
      />

      <div className="mt-3">
        <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              isLarge ? 'bg-amber-400' : isMedium ? 'bg-sky-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>{length.toLocaleString()} characters</span>
          <span className="font-mono">Small &lt; 250 · Medium 250–1,000 · Large &gt; 1,000</span>
        </div>
      </div>

      {isLarge ? (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <Scissors className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <p className="text-xs font-semibold text-amber-200">
              This draft is in the Large cohort (over 1,000 characters).
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-200/80">
              Consider splitting it into smaller pull requests: one logical change each, a short
              problem statement, and a focused test plan. Smaller PRs are usually reviewed and
              unblocked faster.
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          {isMedium
            ? 'Medium draft. Keep the summary tight and link any long design notes instead of inlining them.'
            : 'Small draft. This is within the fastest-review guidance range.'}
        </p>
      )}

      <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
        Description length is a drafting heuristic from the Phase 2 plan. The statistical engine
        classifies reviewed PRs by changed lines and files, not by body length.
      </p>
    </section>
  );
}

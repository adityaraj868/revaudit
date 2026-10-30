import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Clock3, GitPullRequest, Search, UserRound } from 'lucide-react';
import PageHeader from './PageHeader';
import { ErrorState, LoadingState } from './States';

const formatDuration = (hours) => {
  if (hours >= 48) return `${(hours / 24).toFixed(1)} days`;
  return `${hours.toFixed(1)} hours`;
};

const medianOf = (values) => {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

export default function ContributorDashboard({ auditData, currentRepo, loading, error, onRefresh }) {
  const [username, setUsername] = useState('');
  const allPullRequests = auditData?.pull_requests || [];
  const isPartialSample = !Array.isArray(auditData?.pull_requests);

  const contributorPRs = useMemo(() => {
    const query = username.trim().replace(/^@/, '').toLowerCase();
    if (!query) return [];
    const rows = allPullRequests.length > 0 ? allPullRequests : (auditData?.anomalies || []);
    return rows
      .filter((pr) => (pr.author || '').toLowerCase() === query)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [allPullRequests, auditData, username]);

  if (loading) return <LoadingState repo={currentRepo} />;
  if (error) return <ErrorState error={error} onRetry={onRefresh} />;

  const turnaroundValues = contributorPRs.map((pr) => Number(pr.turnaround_hours ?? pr.review_time_hours ?? 0));
  const medianTurnaround = medianOf(turnaroundValues);
  const flaggedCount = contributorPRs.filter((pr) => pr.is_anomaly ?? true).length;
  const matchingFullSample = allPullRequests.filter((pr) => (pr.author || '').toLowerCase() === username.trim().replace(/^@/, '').toLowerCase()).length;

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={`Contributor Dashboard${username.trim() ? `: @${username.trim().replace(/^@/, '')}` : ''}`}
        subtitle={`A personal view of merged PR turnaround in ${currentRepo || 'the selected repository'}.`}
        badges={[
          { label: 'Contributor View', color: 'bg-slate-800 text-slate-300 border-slate-700' },
          { label: 'Merged PR sample', color: 'bg-slate-800 text-slate-300 border-slate-700' },
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
            onChange={(event) => setUsername(event.target.value)}
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
          This API response does not include the full merged PR sample, so only available flagged records can be searched. The backend needs to return its <code>pull_requests</code> list for a complete contributor breakdown.
        </div>
      )}

      {!username.trim() ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-5 py-10 text-center">
          <UserRound className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-200">Look up your contribution history</h2>
          <p className="mt-1 text-sm text-slate-400">Enter your GitHub username to see merged PRs and their review turnaround.</p>
        </div>
      ) : contributorPRs.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-10 text-center">
          <GitPullRequest className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-200">No merged PRs found for @{username.trim().replace(/^@/, '')}</h2>
          <p className="mt-1 text-sm text-slate-400">This audit covers up to the 30 most recently closed PRs. Check the spelling or choose another repository.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard icon={GitPullRequest} label="Merged PRs in sample" value={contributorPRs.length} hint={isPartialSample ? 'Flagged demo records only' : 'Recent repository sample'} />
            <SummaryCard icon={Clock3} label="Median turnaround" value={formatDuration(medianTurnaround)} hint="Created to merged" />
            <SummaryCard icon={AlertTriangle} label="Above cohort threshold" value={`${flaggedCount} / ${contributorPRs.length}`} hint="More than 1.5× cohort median" tone={flaggedCount ? 'amber' : 'emerald'} />
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Your pull requests</h2>
              <p className="mt-1 text-xs text-slate-400">Turnaround is measured from PR creation to merge and compared with similar description-length cohorts.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Pull request</th>
                    <th className="px-4 py-3 font-medium">Size cohort</th>
                    <th className="px-4 py-3 text-right font-medium">Turnaround</th>
                    <th className="px-4 py-3 text-right font-medium">Cohort median</th>
                    <th className="px-4 py-3 font-medium">Comparison</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {contributorPRs.map((pr) => {
                    const hours = Number(pr.turnaround_hours ?? pr.review_time_hours ?? 0);
                    const median = Number(pr.group_median_hours || 0);
                    const flagged = Boolean(pr.is_anomaly ?? (hours > 1.5 * median));
                    return (
                      <tr key={pr.pr_number} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <a href={pr.html_url} target="_blank" rel="noreferrer" className="flex max-w-[420px] items-center gap-1.5 font-medium text-slate-200 hover:text-orange-300">
                            <span className="truncate">#{pr.pr_number} {pr.title}</span>
                            <ArrowUpRight className="h-3 w-3 shrink-0" />
                          </a>
                          <span className="mt-1 block text-[11px] text-slate-500">Merged {new Date(pr.merged_at).toLocaleDateString()}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{pr.size_category}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200">{formatDuration(hours)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-400">{formatDuration(median)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-1 text-[11px] ${flagged ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
                            {flagged ? 'Longer than cohort norm' : 'Within cohort range'}
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

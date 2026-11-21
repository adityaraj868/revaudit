import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, FileDown, GitPullRequest, Printer, Scale, Users } from 'lucide-react';
import PageHeader from './PageHeader';
import { ErrorState } from './States';
import { DashboardSkeleton } from './SkeletonLoader';

const COHORTS = ['Small', 'Medium', 'Large', 'Unknown'];

function formatHours(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `${Number(value).toFixed(2)} h`;
}

function formatInterval(interval) {
  if (!Array.isArray(interval) || interval.length !== 2) return '—';
  return `[${Number(interval[0]).toFixed(2)}, ${Number(interval[1]).toFixed(2)}]`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export default function ManagerDashboard({ auditData, currentRepo, loading, error, onRefresh }) {
  const baselines = auditData?.baseline_medians ?? {};
  const anomalies = auditData?.anomalies ?? [];
  const workloadAnomalies = auditData?.workload_anomalies ?? [];
  const workloadEngine = auditData?.workload_engine ?? {};
  const stages = auditData?.stage_metrics ?? {};
  const metadata = auditData?.metadata ?? {};
  const quality = auditData?.data_quality ?? {};

  if (loading && !auditData) return <DashboardSkeleton label="Loading manager report" />;
  if (error) return <ErrorState error={error} onRetry={onRefresh} />;
  if (!auditData) {
    return <ErrorState error="No audit payload is loaded. Run a repository audit first." onRetry={onRefresh} />;
  }

  const sample = auditData.total_prs_in_sample ?? auditData.pull_requests?.length ?? 0;
  const merged = auditData.merged_prs_count ?? 0;
  const observed = auditData.first_review_observed_count ?? 0;
  const censored = auditData.first_review_censored_count ?? 0;
  const anomalous = auditData.anomalies_count ?? anomalies.length;
  const medianLatency = auditData.observed_median_first_review_hours;
  const workloadFlagged = workloadEngine.flagged_count ?? workloadAnomalies.length;

  return (
    <div className="manager-report space-y-6 font-sans">
      <PageHeader
        title="Manager Report"
        subtitle={`Size-stratified review-effort matrix for ${currentRepo || 'the selected repository'}.`}
        badges={[
          { label: 'Manager View', color: 'bg-slate-800 text-slate-300 border-slate-700' },
          { label: 'Anomaly matrix', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
          { label: 'Print-ready', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-orange-400"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / Save as PDF
          </button>
        }
      />

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-[11px] text-slate-400 print-surface">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <span>
            Repository: <span className="font-mono text-slate-200">{metadata.owner || currentRepo}</span>
          </span>
          <span>Analysis version: {metadata.analysis_version || '—'}</span>
          <span>As of: {formatDate(metadata.as_of)}</span>
          <span>
            Sample window: {formatDate(metadata.sample_window_start)} – {formatDate(metadata.sample_window_end)}
          </span>
          <span>GitHub API: {metadata.github_authenticated ? 'authenticated' : 'unauthenticated'}</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Report summary">
        <Summary icon={GitPullRequest} label="PRs sampled" value={sample} />
        <Summary icon={CheckCircle2} label="Merged" value={merged} />
        <Summary icon={Clock3} label="First reviews observed" value={observed} hint={`${censored} censored`} />
        <Summary icon={Scale} label="Median first review" value={medianLatency == null ? '—' : `${Number(medianLatency).toFixed(1)} h`} />
        <Summary icon={AlertTriangle} label="Robust triage signals" value={anomalous} tone={anomalous ? 'amber' : 'emerald'} />
        <Summary
          icon={AlertTriangle}
          label="Workload-adjusted signals"
          value={workloadFlagged}
          hint="Dynamic 1.5 + 0.15×queue rule"
          tone={workloadFlagged ? 'amber' : 'emerald'}
        />
        <Summary
          icon={FileDown}
          label="Timeline coverage"
          value={`${quality.timeline_coverage_pct ?? 0}%`}
          hint={`${quality.timeline_records_complete ?? 0} PR timelines`}
        />
        <Summary
          icon={Users}
          label="Review-request coverage"
          value={`${workloadEngine.request_coverage_pct ?? 0}%`}
          hint={`${workloadEngine.evaluated_prs ?? 0} PRs evaluated`}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 print-surface">
        <SectionHeading
          title="Size-stratified baseline matrix"
          description="Kaplan–Meier medians with non-parametric bootstrap 95% confidence intervals. Right-censored PRs remain in the estimate."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Cohort</th>
                <th className="px-4 py-3 text-right font-medium">Sample</th>
                <th className="px-4 py-3 text-right font-medium">Events</th>
                <th className="px-4 py-3 text-right font-medium">Censored</th>
                <th className="px-4 py-3 text-right font-medium">Median (h)</th>
                <th className="px-4 py-3 font-medium">95% CI (h)</th>
                <th className="px-4 py-3 font-medium">Estimate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {COHORTS.map((cohort) => {
                const row = baselines[cohort] ?? {};
                return (
                  <tr key={cohort}>
                    <td className="px-4 py-3 font-medium text-slate-200">{cohort}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">{row.sample_size ?? 0}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">{row.event_count ?? 0}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">{row.censored_count ?? 0}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">{formatHours(row.median_hours)}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{formatInterval(row.confidence_interval_95)}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {(row.estimate_status || '—').replaceAll('_', ' ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-800 px-4 py-2.5 text-[11px] text-slate-500">
          Cohort definition: {quality.complexity_definition?.small || 'Small ≤100 changed lines and ≤5 files'}.
          {quality.complexity_definition?.medium ? ` Medium: ${quality.complexity_definition.medium}.` : ''}
        </p>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 print-surface">
        <SectionHeading
          title="Adjusted triage matrix"
          description={`Robust Huber residuals on log first-review latency. |z| ≥ ${anomalies[0]?.threshold_abs_z ?? 2.5} is listed as a process signal, in either direction.`}
        />
        {anomalies.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            No adjusted triage signals were detected in this sample.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">PR</th>
                  <th className="px-4 py-3 font-medium">Author</th>
                  <th className="px-4 py-3 font-medium">Cohort</th>
                  <th className="px-4 py-3 text-right font-medium">Latency (h)</th>
                  <th className="px-4 py-3 text-right font-medium">Expected (h)</th>
                  <th className="px-4 py-3 text-right font-medium">Robust z</th>
                  <th className="px-4 py-3 font-medium">Direction</th>
                  <th className="px-4 py-3 text-right font-medium">Lines / files</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {anomalies.map((row) => (
                  <tr key={`${row.pr_number}-${row.anomaly_direction}`}>
                    <td className="px-4 py-3">
                      <a
                        href={row.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-200 hover:text-orange-300"
                      >
                        #{row.pr_number} {row.title}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-300">@{row.author}</td>
                    <td className="px-4 py-3 text-slate-300">{row.size_category}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">{formatHours(row.review_time_hours)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">{formatHours(row.expected_first_review_hours)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">
                      {row.standardized_residual == null ? '—' : Number(row.standardized_residual).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {(row.anomaly_direction || '').replaceAll('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      {row.changed_lines ?? '—'} / {row.files_changed ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-slate-800 px-4 py-2.5 text-[11px] text-slate-500">
          {quality.anomaly_interpretation ||
            'Triage signals for process investigation; shorter turnaround does not establish review quality.'}
        </p>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 print-surface">
        <SectionHeading
          title="Workload-adjusted threshold matrix"
          description="Dynamic_Threshold = 1.5 + (0.15 × active PRs in the reviewer's queue at ready-for-review time)."
        />
        {workloadAnomalies.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            No PR crossed its workload-adjusted threshold in this sample.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">PR</th>
                  <th className="px-4 py-3 font-medium">First reviewer</th>
                  <th className="px-4 py-3 text-right font-medium">Queue at creation</th>
                  <th className="px-4 py-3 text-right font-medium">Multiplier</th>
                  <th className="px-4 py-3 text-right font-medium">Threshold (h)</th>
                  <th className="px-4 py-3 text-right font-medium">Latency (h)</th>
                  <th className="px-4 py-3 text-right font-medium">× Cohort median</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {workloadAnomalies.map((row) => (
                  <tr key={row.pr_number}>
                    <td className="px-4 py-3">
                      <a
                        href={row.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-200 hover:text-orange-300"
                      >
                        #{row.pr_number} {row.title}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-300">@{row.first_reviewer}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">{row.reviewer_queue_at_creation ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">
                      {row.dynamic_threshold_ratio == null ? '—' : `${Number(row.dynamic_threshold_ratio).toFixed(2)}×`}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">{formatHours(row.dynamic_threshold_hours)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">{formatHours(row.first_review_latency_hours)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      {row.workload_ratio_to_median == null ? '—' : `${Number(row.workload_ratio_to_median).toFixed(2)}×`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-slate-800 px-4 py-2.5 text-[11px] text-slate-500">
          {workloadEngine.limitation ||
            'Queue pressure is reconstructed from explicit review_requested events in the sampled window.'}{' '}
          Average queue at creation: {workloadEngine.average_queue_at_creation ?? '—'} · Max:{' '}
          {workloadEngine.max_queue_at_creation ?? '—'}.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 print-surface">
          <SectionHeading title="Lifecycle stage medians" description="Conditional on the stage event being available." />
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Stage</th>
                <th className="px-4 py-2.5 text-right font-medium">Median (h)</th>
                <th className="px-4 py-2.5 text-right font-medium">n</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {[
                ['Request → first review', stages.request_to_first_review],
                ['Author response after review', stages.author_response_after_first_review],
                ['Approval → merge', stages.approval_to_merge],
              ].map(([label, stage]) => (
                <tr key={label}>
                  <td className="px-4 py-2.5 text-slate-300">{label}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-200">{formatHours(stage?.median_hours)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-400">{stage?.sample_size ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 print-surface">
          <h2 className="text-sm font-semibold text-white">Data quality &amp; caveats</h2>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-slate-400">
            <li>Primary outcome: {quality.primary_outcome || 'time to first human review'}</li>
            <li>Workload proxy: {quality.reviewer_workload_proxy || 'recent reviewer activity'}</li>
            <li>
              Workload rule:{' '}
              {quality.workload_threshold_rule ||
                'Dynamic_Threshold = 1.5 + (0.15 * active_prs_in_queue)'}
            </li>
            <li>Author response proxy: {quality.author_response_proxy || 'first author comment after review'}</li>
            <li>{quality.stage_metrics_note || 'Stage metrics are conditional on the event being observed.'}</li>
          </ul>
          {(quality.warnings || []).length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-4 text-[11px] text-amber-300/90">
              {quality.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-center text-[10px] text-slate-500">
        Generated by RevAudit · {formatDate(metadata.as_of)} · This report describes process patterns,
        not individual performance or review quality.
      </p>
    </div>
  );
}

function SectionHeading({ title, description }) {
  return (
    <div className="border-b border-slate-800 px-4 py-3">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {description && <p className="mt-1 text-[11px] text-slate-400">{description}</p>}
    </div>
  );
}

function Summary({ icon: Icon, label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'text-white',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
  };
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 print-surface">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className={`mt-1.5 text-lg font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

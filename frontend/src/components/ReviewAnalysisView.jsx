import React, { useState } from 'react';
import { 
  Scale, 
  Layers, 
  RefreshCw, 
  ExternalLink, 
  FileText, 
  Filter,
  CheckCircle2
} from 'lucide-react';
import PageHeader from './PageHeader';
import { CohortLatencyChart, TurnaroundScatterChart } from './StatisticalCharts';
import EvidenceModal from './EvidenceModal';
import { LoadingState, ErrorState } from './States';

export default function ReviewAnalysisView({ 
  auditData, 
  currentRepo = 'fastapi/fastapi', 
  repoOwner = 'fastapi', 
  repoName = 'fastapi',
  loading = false,
  error = null,
  onRefresh
}) {
  const [selectedCohort, setSelectedCohort] = useState('ALL');
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading) {
    return <LoadingState repo={currentRepo} />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRefresh} />;
  }

  if (!auditData) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 font-sans border border-slate-800 rounded-2xl bg-slate-900 space-y-3">
        <p>No audit data currently available for {currentRepo}.</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-xs transition-colors cursor-pointer"
          >
            Run Audit Analysis
          </button>
        )}
      </div>
    );
  }

  const baselineMedians = auditData?.baseline_medians || {};
  const anomalies = auditData?.anomalies || [];
  const mergedCount = auditData?.merged_prs_count || 0;
  const totalClosed = auditData?.total_closed_prs || 0;
  const droppedCount = auditData?.unmerged_prs_dropped || 0;
  const retentionRate = totalClosed > 0 ? ((mergedCount / totalClosed) * 100).toFixed(1) : '0.0';

  const cohortDefinitions = [
    { key: 'Small', name: 'Small PRs', range: '< 250 chars', desc: 'Minor bugfixes, docs, typo patches' },
    { key: 'Medium', name: 'Medium PRs', range: '250 – 1000 chars', desc: 'Standard feature updates, components' },
    { key: 'Large', name: 'Large PRs', range: '> 1000 chars', desc: 'Subsystem overhauls, major migrations' }
  ];

  // Filter anomalies by selected cohort
  const filteredAnomalies = selectedCohort === 'ALL'
    ? anomalies
    : anomalies.filter(a => a.size_category === selectedCohort);

  const handleOpenEvidence = (anomaly) => {
    setSelectedAnomaly(anomaly);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={`Review Effort Analysis: ${currentRepo}`}
        subtitle="Cohort stratification and turnaround distributions controlling for pull request complexity"
        badges={[
          { label: `${mergedCount} Merged PRs Evaluated`, color: 'bg-slate-800 text-slate-300 border-slate-700' },
          { label: `${droppedCount} Unmerged Discarded`, color: 'bg-slate-800 text-slate-400 border-slate-700' },
          { label: `${anomalies.length} Flagged Outliers`, color: anomalies.length > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
        ]}
        actions={
          onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )
        }
      />

      {/* Overview Stat Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
          <div className="text-xs text-slate-400 font-medium">Sample Ingestion</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {mergedCount} <span className="text-xs font-normal text-slate-400 font-sans">/ {totalClosed} closed</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Survival retention rate: {retentionRate}%
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
          <div className="text-xs text-slate-400 font-medium">Flagged Outliers</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {anomalies.length} <span className="text-xs font-normal text-slate-400 font-sans">PRs</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Exceeded &gt; 1.5x cohort median
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
          <div className="text-xs text-slate-400 font-medium">Complexity Stratification</div>
          <div className="text-sm font-semibold text-white mt-1">
            Description Proxy (L_body)
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            3 Buckets: Small (&lt;250c) / Medium / Large (&gt;1000c)
          </div>
        </div>
      </div>

      {/* Cohort Breakdown Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <span>Cohort Stratification Matrix</span>
          </h3>
          <span className="text-xs text-slate-400">Click a cohort row to filter anomalies below</span>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-2.5 px-3.5 font-medium">Cohort</th>
                <th className="py-2.5 px-3.5 font-medium">Scope Proxy</th>
                <th className="py-2.5 px-3.5 font-medium text-right">Sample Size (n)</th>
                <th className="py-2.5 px-3.5 font-medium text-right">Median Latency (x̃)</th>
                <th className="py-2.5 px-3.5 font-medium">90% Confidence Interval</th>
                <th className="py-2.5 px-3.5 font-medium text-right">1.5x Threshold</th>
                <th className="py-2.5 px-3.5 font-medium text-right">Flagged Anomalies</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {cohortDefinitions.map((c) => {
                const data = baselineMedians[c.key];
                const hasData = Boolean(data && data.sample_size > 0);
                const median = hasData ? data.median_hours : 0;
                const ci = hasData && data.mock_ci_90 ? data.mock_ci_90 : [0, 0];
                const threshold = (median * 1.5).toFixed(2);
                const cohortAnomalies = anomalies.filter(a => a.size_category === c.key);
                const isSelected = selectedCohort === c.key;

                return (
                  <tr 
                    key={c.key} 
                    onClick={() => setSelectedCohort(isSelected ? 'ALL' : c.key)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-600/10 hover:bg-blue-600/15' 
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-2.5 px-3.5 font-medium text-slate-200 flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-slate-600'}`}></span>
                      <span>{c.name}</span>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-400 font-mono text-[11px]">
                      {c.range}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-slate-200">
                      {hasData ? data.sample_size : 0}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-medium text-slate-100">
                      {hasData ? `${median.toFixed(2)}h` : '—'}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-300">
                      {hasData ? `[${ci[0].toFixed(2)}h – ${ci[1].toFixed(2)}h]` : '—'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-amber-400">
                      {hasData ? `> ${threshold}h` : '—'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-semibold">
                      {cohortAnomalies.length > 0 ? (
                        <span className="text-amber-400">+{cohortAnomalies.length}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CohortLatencyChart baselineMedians={baselineMedians} />
        <TurnaroundScatterChart 
          anomalies={anomalies} 
          baselineMedians={baselineMedians} 
          onSelectAnomaly={handleOpenEvidence}
        />
      </div>

      {/* Detailed Cohort Outlier Inspection Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>
                {selectedCohort === 'ALL' ? 'All Cohort Outliers' : `${selectedCohort} Cohort Outliers`} ({filteredAnomalies.length})
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pull requests that deviated beyond the 1.5x statistical boundary of their size bucket.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 font-mono text-xs">
            <button
              onClick={() => setSelectedCohort('ALL')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer border ${
                selectedCohort === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-500 font-medium'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              All ({anomalies.length})
            </button>
            {cohortDefinitions.map((c) => {
              const count = anomalies.filter(a => a.size_category === c.key).length;
              const isActive = selectedCohort === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setSelectedCohort(c.key)}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-500 font-medium'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  {c.key} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Anomaly Inspection Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
          {filteredAnomalies.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-sans space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
              <div className="text-slate-200 font-medium">No Anomalies in this Cohort</div>
              <p className="text-[11px] text-slate-500">All evaluated pull requests conformed to the 1.5x turnaround median.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3.5 font-medium">PR # &amp; Title</th>
                    <th className="py-2.5 px-3.5 font-medium">Author</th>
                    <th className="py-2.5 px-3.5 font-medium">Cohort</th>
                    <th className="py-2.5 px-3.5 font-medium text-right">Turnaround</th>
                    <th className="py-2.5 px-3.5 font-medium text-right">Cohort Baseline</th>
                    <th className="py-2.5 px-3.5 font-medium text-right">Ratio</th>
                    <th className="py-2.5 px-3.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAnomalies.map((item) => (
                    <tr key={item.pr_number} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3.5 max-w-xs truncate font-medium text-slate-200">
                        <span className="font-mono text-blue-400 mr-1.5">#{item.pr_number}</span>
                        <span className="truncate">{item.title || `Pull Request #${item.pr_number}`}</span>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-400">
                        @{item.author || 'contributor'}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-300">
                        {item.size_category} <span className="text-[10px] text-slate-500">({item.body_length}c)</span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-400">
                        {item.review_time_hours?.toFixed(2)}h
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-400">
                        {item.group_median_hours?.toFixed(2)}h
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-amber-400">
                        +{item.anomaly_ratio?.toFixed(2)}x
                      </td>
                      <td className="py-2.5 px-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEvidence(item)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium border border-slate-700 transition-colors cursor-pointer inline-flex items-center space-x-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Dossier</span>
                        </button>
                        {item.html_url && (
                          <a
                            href={item.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 rounded text-[11px] font-medium border border-blue-500/20 transition-colors inline-flex items-center space-x-1"
                          >
                            <span>GitHub</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Statistical Controls Explanation */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-2.5 text-xs text-slate-300">
        <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
          <Scale className="w-4 h-4 text-slate-400" />
          <span>Controlled Confounders in Review Analysis</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-slate-400 text-xs">
          <div>
            <strong className="text-slate-200 block mb-1">1. Size Stratification</strong>
            PR description length (L_body) controls for review scope, preventing superficial approvals on small PRs from distorting complex architectural reviews.
          </div>
          <div>
            <strong className="text-slate-200 block mb-1">2. Survival Imputation</strong>
            Unmerged/abandoned branches are discarded (merged_at ≠ null) to evaluate completed integration workflows rather than rejected experiments.
          </div>
          <div>
            <strong className="text-slate-200 block mb-1">3. Non-Parametric Medians</strong>
            50% breakdown-point medians (x̃) paired with 90% confidence intervals resist right-skewed heavy-tailed latency outliers.
          </div>
        </div>
      </div>

      {/* Statistical Evidence Modal */}
      <EvidenceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        anomaly={selectedAnomaly}
        repoOwner={repoOwner}
        repoName={repoName}
      />
    </div>
  );
}

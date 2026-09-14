import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import PageHeader from './PageHeader';
import AnomalyTable from './AnomalyTable';
import { LoadingState, ErrorState } from './States';

export default function DetectedPatternsView({ 
  auditData, 
  currentRepo, 
  repoOwner, 
  repoName,
  loading = false,
  error = null,
  onRefresh
}) {
  if (loading) {
    return <LoadingState repo={currentRepo} />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRefresh} />;
  }

  const anomalies = auditData?.anomalies || [];
  const anomaliesCount = anomalies.length;
  const mergedCount = auditData?.merged_prs_count || 0;
  const anomalyRate = mergedCount > 0 ? ((anomaliesCount / mergedCount) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detected Review Effort Patterns &amp; Anomalies"
        subtitle={`Flagged pull requests taking > 1.5x of their size cohort baseline for ${currentRepo || 'target repository'}`}
        badges={[
          { 
            label: `${anomaliesCount} Anomalies (${anomalyRate}% of cohort)`, 
            color: anomaliesCount > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
          },
          { label: 'Threshold: > 1.5x Median', color: 'bg-slate-800 text-slate-300 border-slate-700' }
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

      {/* Pattern Overview Banner */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-white text-xs block">
              Pattern Definition: Size-Stratified Latency Outliers
            </strong>
            <span className="text-slate-400 text-[11px] font-sans">
              Pull requests exceeding 1.5 times the median review turnaround duration of their respective size bucket.
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <span>Anomaly Rate:</span>
          <strong className={`font-bold ${anomaliesCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {anomalyRate}%
          </strong>
        </div>
      </div>

      {/* Full Anomaly Table */}
      <AnomalyTable
        anomalies={anomalies}
        repoOwner={repoOwner}
        repoName={repoName}
      />
    </div>
  );
}

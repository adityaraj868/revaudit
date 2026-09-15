import React from 'react';
import { SingleRepoAuditResponse } from '../types/audit';
import { 
  GitPullRequest, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers, 
  Users, 
  Scale, 
  X, 
  ExternalLink,
  Code,
  FileCode,
  ShieldCheck
} from 'lucide-react';

interface SingleRepoAuditReportProps {
  report: SingleRepoAuditResponse;
  onClear: () => void;
}

export const SingleRepoAuditReport: React.FC<SingleRepoAuditReportProps> = ({ report, onClear }) => {
  const isAnomaly = report.is_anomaly;
  const isDelayed = report.residual_z_score > 2.0;

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-850 border border-teal-500/40 shadow-xl space-y-6 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl">
              <GitPullRequest className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-black text-white font-mono tracking-tight">
                  {report.repo_name}
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded-full font-mono">
                  Audited Target
                </span>
              </div>
              <p className="text-xs text-slate-400">
                On-demand statistical audit across {report.total_prs_analyzed} scrubbed human PR interactions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
            report.badge_type === 'anomaly'
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              : report.badge_type === 'expedited'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-teal-500/10 text-teal-300 border-teal-500/30'
          }`}>
            <span className={`h-2 w-2 rounded-full ${
              report.badge_type === 'anomaly' ? 'bg-rose-500 animate-pulse' : report.badge_type === 'expedited' ? 'bg-emerald-500' : 'bg-teal-400'
            }`}></span>
            <span>{report.status}</span>
          </span>

          <button
            onClick={onClear}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Dismiss Report"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        {/* Card 1: Observed */}
        <div className="p-4 bg-slate-850 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-[11px] block">Observed Latency:</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">
            {report.observed_mean_latency_hrs.toFixed(1)} hrs
          </span>
          <span className="text-[10px] text-slate-400 block font-sans">
            Median: {report.observed_median_hrs.toFixed(1)} hrs
          </span>
        </div>

        {/* Card 2: Expected Baseline */}
        <div className="p-4 bg-slate-850 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-[11px] block">Model-Adjusted Expected:</span>
          <span className="text-2xl font-black text-teal-400 mt-1 block">
            {report.expected_latency_hrs.toFixed(1)} hrs
          </span>
          <span className="text-[10px] text-slate-400 block font-sans">
            Confounder-controlled
          </span>
        </div>

        {/* Card 3: 95% Confidence Interval */}
        <div className="p-4 bg-slate-850 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-[11px] block">95% Conf. Interval:</span>
          <span className="text-lg font-bold text-slate-200 mt-1 block">
            [{report.confidence_interval_95[0].toFixed(1)}h, {report.confidence_interval_95[1].toFixed(1)}h]
          </span>
          <span className="text-[10px] text-slate-400 block font-sans">
            Uncertainty bound [μ ± 1.96·SE]
          </span>
        </div>

        {/* Card 4: Standardized Z Residual */}
        <div className="p-4 bg-slate-850 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-[11px] block">Standardized Z-Score:</span>
          <span className={`text-2xl font-black mt-1 block ${
            Math.abs(report.residual_z_score) > 2 ? 'text-rose-400' : 'text-teal-300'
          }`}>
            {report.residual_z_score > 0 ? `+${report.residual_z_score.toFixed(2)}` : report.residual_z_score.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block font-sans">
            {Math.abs(report.residual_z_score) > 2 ? 'Significant Shift (p < 0.05)' : 'Within Control Bounds'}
          </span>
        </div>
      </div>

      {/* Diagnosis Banner */}
      <div className={`p-4 rounded-xl border text-xs flex items-start space-x-3 ${
        isAnomaly 
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' 
          : 'bg-teal-500/10 border-teal-500/30 text-teal-200'
      }`}>
        <div className="p-1 rounded bg-slate-900/50 mt-0.5 shrink-0">
          {isAnomaly ? <AlertTriangle className="h-4 w-4 text-rose-400" /> : <ShieldCheck className="h-4 w-4 text-teal-400" />}
        </div>
        <div>
          <span className="font-bold font-mono mr-1">Process Diagnosis:</span>
          <span>{report.diagnosis}</span>
        </div>
      </div>

      {/* Recent PR Sample Table */}
      {(() => {
        const records = report.prs || report.pr_records || [];
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center space-x-2">
                <FileCode className="h-4 w-4 text-teal-400" />
                <span>Recent Audited Pull Requests (Last {records.length} interactions)</span>
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                Avg Workload: {report.avg_reviewer_workload.toFixed(1)} PRs • Avg Churn: {report.avg_lines_added.toFixed(0)} lines
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300 font-mono">
                <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">PR Identifier &amp; Title</th>
                    <th className="py-2.5 px-3">Author</th>
                    <th className="py-2.5 px-3">Subsystem</th>
                    <th className="py-2.5 px-3 text-right">Churn</th>
                    <th className="py-2.5 px-3 text-right">Workload</th>
                    <th className="py-2.5 px-3 text-right">Latency</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {records.map((pr) => (
                    <tr key={pr.pr_id} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 max-w-xs">
                        <span className="font-bold text-teal-400 mr-1.5">{pr.pr_id.split('_').slice(-2).join('_')}</span>
                        <span className="text-slate-300 font-sans truncate inline-block max-w-[200px] align-bottom" title={pr.title}>
                          {pr.title}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-sans">{pr.author_id}</td>
                      <td className="py-2 px-3 uppercase text-teal-300 text-[10px]">{pr.subsystem}</td>
                      <td className="py-2 px-3 text-right text-emerald-400">+{pr.lines_added}</td>
                      <td className="py-2 px-3 text-right font-bold text-amber-400">{pr.workload} PRs</td>
                      <td className="py-2 px-3 text-right font-bold text-white">{pr.latency_hrs.toFixed(1)}h</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          pr.is_merged 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                            : pr.was_changes_requested 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {pr.is_merged ? 'MERGED' : pr.was_changes_requested ? 'CHANGES' : 'APPROVED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

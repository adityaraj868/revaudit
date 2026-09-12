import React, { useState } from 'react';
import { RepositoryAuditSummary } from '../types';
import { getAnomalyBadgeStyles, formatLatency, formatCI } from '../lib/statisticalEngine';
import { Search, ArrowUpDown, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, ShieldCheck, ExternalLink, Info } from 'lucide-react';

interface RepositoryAuditTableProps {
  repositories: RepositoryAuditSummary[];
  onSelectRepo?: (repo: string) => void;
}

export const RepositoryAuditTable: React.FC<RepositoryAuditTableProps> = ({
  repositories,
  onSelectRepo
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof RepositoryAuditSummary>('observed_mean_latency_hrs');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);

  const handleSort = (field: keyof RepositoryAuditSummary) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredData = repositories
    .filter(r => {
      const matchesSearch = r.repo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc 
        ? String(valA).localeCompare(String(valB)) 
        : String(valB).localeCompare(String(valA));
    });

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
      {/* Table Header & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-white">Repository Statistical Process Matrix</h3>
            <span className="px-2 py-0.5 text-xs font-semibold bg-slate-800 text-teal-300 border border-slate-700 rounded-md font-mono">
              15 Tracked Ecosystems
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical observations vs multi-level model adjusted expectations, standardized Z-residuals, and systemic process anomaly detection.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search repository or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono w-56"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_CONTROL">In Control (|Z| ≤ 1.96)</option>
            <option value="DELAY_BOTTLENECK">Delay Bottleneck (|Z| &gt; 2.0)</option>
            <option value="EXPEDITED_QUEUE">Expedited Flow (|Z| &gt; 2.0)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 font-mono uppercase text-[11px]">
            <tr>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('repo')}>
                <div className="flex items-center space-x-1">
                  <span>Repository</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('sample_size')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Sample (N)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('observed_mean_latency_hrs')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Observed Turnaround</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('expected_latency_hrs')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Model Expected (95% CI)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('z_score')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Z-Score Residual</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">Process Status</th>
              <th className="py-3 px-3 text-center">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono">
            {filteredData.map((repo) => {
              const badge = getAnomalyBadgeStyles(repo.status);
              const isExpanded = expandedRepo === repo.repo;

              return (
                <React.Fragment key={repo.repo}>
                  <tr className={`hover:bg-slate-800/40 transition-colors ${isExpanded ? 'bg-slate-800/30' : ''}`}>
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center space-x-2">
                        <span>{repo.repo}</span>
                        {repo.controlled_shift_injected && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded" title="Controlled Shift Injected (+24h)">
                            SHIFT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-sans">{repo.category}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-200">{repo.sample_size} PRs</td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-bold text-amber-400">{repo.observed_mean_latency_hrs.toFixed(1)}h</span>
                      <span className="text-slate-400 text-[10px] block font-sans">med: {repo.observed_median_latency_hrs.toFixed(1)}h</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-bold text-teal-400">{repo.expected_latency_hrs.toFixed(1)}h</span>
                      <span className="text-slate-400 text-[10px] block">{formatCI(repo.expected_ci_95)}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`font-bold ${Math.abs(repo.z_score) > 2 ? 'text-rose-400' : 'text-teal-300'}`}>
                        {repo.z_score > 0 ? `+${repo.z_score.toFixed(2)}` : repo.z_score.toFixed(2)}
                      </span>
                      <span className="text-slate-400 text-[10px] block font-sans">p = {repo.p_value.toFixed(3)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] border ${badge.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}></span>
                        <span>{badge.label}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setExpandedRepo(isExpanded ? null : repo.repo)}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                        title="Toggle Process Audit Details"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Row for Process Findings & Confounders */}
                  {isExpanded && (
                    <tr className="bg-slate-900/90">
                      <td colSpan={8} className="p-4 border-t border-slate-800">
                        <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3 font-sans">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2 text-xs">
                              <Info className="h-4 w-4 text-teal-400 shrink-0" />
                              <span className="font-bold text-white">Process Audit Finding:</span>
                              <span className="text-slate-300">{repo.process_finding}</span>
                            </div>
                            {onSelectRepo && (
                              <button
                                onClick={() => onSelectRepo(repo.repo)}
                                className="px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded text-[11px] font-medium flex items-center space-x-1"
                              >
                                <span>Filter PRs</span>
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-xs font-mono">
                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Avg Reviewer Workload:</span>
                              <span className="text-white font-bold">{repo.avg_reviewer_workload.toFixed(1)} active PRs</span>
                            </div>
                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Mean Code Churn:</span>
                              <span className="text-white font-bold">{repo.avg_lines_churn.toFixed(0)} lines</span>
                            </div>
                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                              <span className="text-slate-400 text-[10px] block">First-Time Contributors:</span>
                              <span className="text-white font-bold">{repo.first_time_contributor_pct.toFixed(1)}%</span>
                            </div>
                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                              <span className="text-slate-400 text-[10px] block">CI Test Suite Runtime:</span>
                              <span className="text-white font-bold">{repo.ci_runtime_min} mins</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

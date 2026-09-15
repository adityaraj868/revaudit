import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Zap, 
  GitPullRequest,
  SlidersHorizontal,
  Scale,
  X,
  Sparkles
} from 'lucide-react';
import { AnnotatedPRItem } from '../types/audit';

export type PRReviewItem = AnnotatedPRItem;

interface PRReviewAuditTableProps {
  prRecords: AnnotatedPRItem[];
  repoName: string;
}

export const PRReviewAuditTable: React.FC<PRReviewAuditTableProps> = ({
  prRecords,
  repoName
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'HIGH_DISPARITY' | 'DELAYED' | 'HIGH_WORKLOAD' | 'FAST_TRACKED' | 'FIRST_TIME'>('ALL');
  const [sortField, setSortField] = useState<keyof AnnotatedPRItem>('observed_latency_hrs');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);
  const pageSize = 15;

  // Compute size cohort medians across all PRs
  const cohortMedians = useMemo(() => {
    const cohorts = [
      { id: 'micro', name: 'Micro (<50 lines)', min: 0, max: 49 },
      { id: 'small', name: 'Small (50–150 lines)', min: 50, max: 150 },
      { id: 'medium', name: 'Medium (151–350 lines)', min: 151, max: 350 },
      { id: 'large', name: 'Large (351–700 lines)', min: 351, max: 700 },
      { id: 'xlarge', name: 'Extra Large (>700 lines)', min: 701, max: 100000 }
    ];

    const medians: Record<string, { median: number; cohortName: string; count: number; min: number; max: number }> = {};

    cohorts.forEach(c => {
      const cohortPrs = prRecords.filter(p => {
        const churn = p.lines_added + p.lines_deleted;
        return churn >= c.min && churn <= c.max;
      });

      if (cohortPrs.length > 0) {
        const latencies = cohortPrs.map(p => p.observed_latency_hrs ?? p.latency_hrs ?? 20).sort((a, b) => a - b);
        const mid = Math.floor(latencies.length / 2);
        const median = latencies.length % 2 !== 0 ? latencies[mid] : (latencies[mid - 1] + latencies[mid]) / 2;
        medians[c.id] = {
          median: Math.max(1.0, Math.round(median * 10) / 10),
          cohortName: c.name,
          count: cohortPrs.length,
          min: c.min,
          max: c.max
        };
      } else {
        medians[c.id] = { median: 18.0, cohortName: c.name, count: 0, min: c.min, max: c.max };
      }
    });

    return medians;
  }, [prRecords]);

  const getPRCohort = (pr: AnnotatedPRItem) => {
    const churn = pr.lines_added + pr.lines_deleted;
    if (churn < 50) return { id: 'micro', ...cohortMedians['micro'] };
    if (churn <= 150) return { id: 'small', ...cohortMedians['small'] };
    if (churn <= 350) return { id: 'medium', ...cohortMedians['medium'] };
    if (churn <= 700) return { id: 'large', ...cohortMedians['large'] };
    return { id: 'xlarge', ...cohortMedians['xlarge'] };
  };

  const getDisparityRatio = (pr: AnnotatedPRItem) => {
    const cohort = getPRCohort(pr);
    const latency = pr.observed_latency_hrs ?? pr.latency_hrs ?? 20;
    const ratio = Math.round((latency / cohort.median) * 10) / 10;
    return { ratio, cohortMedian: cohort.median, cohortName: cohort.cohortName };
  };

  const selectedPr = useMemo(() => {
    if (!selectedPrId) return null;
    return prRecords.find(p => p.pr_id === selectedPrId) || null;
  }, [selectedPrId, prRecords]);

  const selectedCohort = useMemo(() => {
    if (!selectedPr) return null;
    return getPRCohort(selectedPr);
  }, [selectedPr]);

  const getAuditFlag = (pr: AnnotatedPRItem) => {
    if (pr.verdict_badge === 'delayed' || (pr.pr_z_score && pr.pr_z_score > 2.0)) {
      return {
        label: pr.audit_verdict || 'Delayed vs. Repo Normal',
        color: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        dot: 'bg-rose-500',
        icon: <AlertCircle className="h-3 w-3 text-rose-400" />
      };
    }
    if (pr.verdict_badge === 'fast_tracked' || (pr.pr_z_score && pr.pr_z_score < -2.0)) {
      return {
        label: pr.audit_verdict || 'Fast-Tracked Flow',
        color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        dot: 'bg-emerald-500',
        icon: <Zap className="h-3 w-3 text-emerald-400" />
      };
    }
    if (pr.latency_hrs > 35) {
      return {
        label: 'Elevated Latency (Within 2σ)',
        color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-500',
        icon: <Clock className="h-3 w-3 text-amber-400" />
      };
    }
    return {
      label: pr.audit_verdict || 'Consistent with Repo Baseline',
      color: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
      dot: 'bg-teal-400',
      icon: <CheckCircle2 className="h-3 w-3 text-teal-400" />
    };
  };

  const handleSort = (field: keyof AnnotatedPRItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredData = prRecords
    .filter(pr => {
      // Search filter
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        pr.title.toLowerCase().includes(q) || 
        pr.author_id.toLowerCase().includes(q) ||
        pr.pr_id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Filter types
      if (filterType === 'HIGH_DISPARITY') {
        const { ratio } = getDisparityRatio(pr);
        return ratio >= 2.0 || ratio <= 0.4;
      }
      if (filterType === 'DELAYED') return pr.verdict_badge === 'delayed' || pr.latency_hrs > 36 || (pr.pr_z_score && pr.pr_z_score > 1.5);
      if (filterType === 'HIGH_WORKLOAD') return pr.workload >= 5;
      if (filterType === 'FAST_TRACKED') return pr.verdict_badge === 'fast_tracked' || (pr.pr_z_score && pr.pr_z_score < -1.5) || pr.latency_hrs < 12;
      if (filterType === 'FIRST_TIME') return pr.is_first_time || pr.author_id.includes('contributor_0');

      return true;
    })
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc 
        ? String(valA ?? '').localeCompare(String(valB ?? '')) 
        : String(valB ?? '').localeCompare(String(a[sortField] ?? ''));
    });

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2 font-mono">
              <GitPullRequest className="h-5 w-5 text-teal-400" />
              <span>PR Review Audit Table</span>
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold bg-slate-800 text-teal-300 border border-slate-700 rounded-md font-mono">
              {filteredData.length} Reviews ({repoName})
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Auditing individual review turnaround times against this repository&apos;s internal baseline and peer patch size medians. Click any row to highlight similar-sized peer PRs.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, author, ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono w-48"
            />
          </div>

          {/* Review Filter Dropdown */}
          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-300">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span>Filter:</span>
            <select
              value={filterType}
              onChange={(e: any) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-teal-300 font-medium focus:outline-none font-mono"
            >
              <option value="ALL" className="bg-slate-900">All Reviews ({prRecords.length})</option>
              <option value="HIGH_DISPARITY" className="bg-slate-900">High-Disparity Pairs (&gt;2x / &lt;0.5x Peer Median)</option>
              <option value="DELAYED" className="bg-slate-900">Delayed Reviews (&gt;Repo Normal)</option>
              <option value="HIGH_WORKLOAD" className="bg-slate-900">High Workload (≥5 PRs)</option>
              <option value="FAST_TRACKED" className="bg-slate-900">Fast-Tracked Flow</option>
              <option value="FIRST_TIME" className="bg-slate-900">First-Time Contributors</option>
            </select>
          </div>
        </div>
      </div>

      {/* Selected Peer PR Highlighting Banner */}
      {selectedPr && selectedCohort && (
        <div className="p-3.5 bg-sky-500/10 border border-sky-500/30 rounded-xl flex items-center justify-between text-xs font-mono text-sky-200">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />
            <div>
              <span>Highlighting Peer Cohort for </span>
              <strong className="text-white">{selectedPr.number ? `#${selectedPr.number}` : selectedPr.pr_id}</strong>
              <span className="text-slate-400"> (+{selectedPr.lines_added}/-{selectedPr.lines_deleted} lines) • </span>
              <span className="text-sky-300 font-semibold">{selectedCohort.cohortName} (Median: {selectedCohort.median}h)</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedPrId(null)}
            className="p-1 hover:bg-sky-500/20 text-sky-300 rounded-lg transition-colors flex items-center space-x-1"
            title="Clear Selection"
          >
            <X className="h-4 w-4" />
            <span className="text-[11px]">Clear</span>
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs text-slate-300 font-mono">
          <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
            <tr>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('pr_id')}>
                <div className="flex items-center space-x-1">
                  <span>PR # &amp; Title</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3">Subsystem</th>
              <th className="py-3 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('lines_added')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>PR Size</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('workload')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Reviewer Load</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('observed_latency_hrs')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Observed</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-right">
                <div className="flex items-center justify-end space-x-1">
                  <Scale className="h-3 w-3 text-amber-400" />
                  <span>Peer Disparity</span>
                </div>
              </th>
              <th className="py-3 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('expected_latency_hrs')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Repo Model</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Outcome</th>
              <th className="py-3 px-4 text-center">Audit Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {paginatedData.map((pr) => {
              const flag = getAuditFlag(pr);
              const prDisplayId = pr.number ? `#${pr.number}` : pr.pr_id.split('_').slice(-2).join('_');
              const observedTime = pr.observed_latency_hrs || pr.latency_hrs || 0;
              const expectedTime = pr.expected_latency_hrs || 20.0;
              const { ratio, cohortMedian } = getDisparityRatio(pr);

              const isSelected = selectedPrId === pr.pr_id;
              const isPeerOfSelected = selectedPr && !isSelected && (
                (pr.lines_added + pr.lines_deleted >= (selectedCohort?.min || 0)) && 
                (pr.lines_added + pr.lines_deleted <= (selectedCohort?.max || 100000))
              );

              return (
                <tr 
                  key={pr.pr_id} 
                  onClick={() => setSelectedPrId(isSelected ? null : pr.pr_id)}
                  className={`transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-teal-500/20 border-l-4 border-l-teal-400' 
                      : isPeerOfSelected 
                      ? 'bg-sky-500/10 border-l-2 border-l-sky-400' 
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-3 px-4 max-w-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-teal-400">{prDisplayId}</span>
                        <span className="text-[10px] text-slate-400 font-sans truncate">{pr.author_id}</span>
                        {(pr.is_first_time || pr.author_id.includes('contributor_0')) && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/20 text-amber-300 rounded font-mono">NEW</span>
                        )}
                        {isPeerOfSelected && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-sky-500/20 text-sky-300 rounded font-mono">PEER</span>
                        )}
                      </div>
                      <p className="text-slate-200 text-xs font-sans truncate" title={pr.title}>
                        {pr.title}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-3 uppercase text-teal-300 text-[10px]">{pr.subsystem || 'core'}</td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-emerald-400">+{pr.lines_added}</span>
                    <span className="text-slate-500 mx-0.5">/</span>
                    <span className="text-rose-400">-{pr.lines_deleted}</span>
                    <span className="text-slate-500 text-[10px] block">{pr.files_changed || Math.max(1, Math.round(pr.lines_added / 45))} files</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`font-bold ${pr.workload >= 5 ? 'text-rose-400' : 'text-amber-300'}`}>
                      {pr.workload} open PRs
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-white">
                    {observedTime.toFixed(1)}h
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`font-bold ${
                      ratio >= 2.0 
                        ? 'text-rose-400' 
                        : ratio <= 0.5 
                        ? 'text-emerald-400' 
                        : 'text-slate-300'
                    }`}>
                      {ratio >= 1.0 ? `+${ratio.toFixed(1)}x` : `${ratio.toFixed(1)}x`}
                    </span>
                    <span className="text-[10px] text-slate-500 block">vs {cohortMedian}h med</span>
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-teal-300">
                    {expectedTime.toFixed(1)}h
                  </td>
                  <td className="py-3 px-3 text-center">
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
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] border ${flag.color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${flag.dot}`}></span>
                      <span>{flag.label}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-2">
        <span>
          Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} reviews
        </span>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ExternalLink, 
  Search, 
  ArrowUpDown, 
  CheckCircle2, 
  FileSearch,
  Bot,
  User
} from 'lucide-react';
import EvidenceModal from './EvidenceModal';

export default function AnomalyTable({ 
  anomalies = [], 
  repoOwner = '', 
  repoName = '' 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('ALL');
  const [sortField, setSortField] = useState('anomaly_ratio');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);

  const filtered = anomalies.filter((item) => {
    const matchesSearch = 
      (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.author || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.pr_number || '').includes(searchQuery);

    const matchesCohort = 
      selectedCohort === 'ALL' || item.size_category === selectedCohort;

    return matchesSearch && matchesCohort;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-3 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">
            Flagged Review Anomalies
          </h3>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {anomalies.length} Detected
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, author, #..."
              className="bg-slate-950 border border-slate-800 text-slate-200 pl-8 pr-3 py-1.5 rounded-md text-xs font-sans focus:outline-none focus:border-slate-600 w-44 sm:w-52"
            />
          </div>

          <select
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 px-2 py-1.5 rounded-md text-xs font-sans focus:outline-none focus:border-slate-600"
          >
            <option value="ALL">All Cohorts</option>
            <option value="Small">Small (&lt;250c)</option>
            <option value="Medium">Medium (250-1000c)</option>
            <option value="Large">Large (&gt;1000c)</option>
          </select>
        </div>
      </div>

      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
        {sorted.length === 0 ? (
          <div className="p-8 text-center space-y-1.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
            <h4 className="text-xs font-semibold text-slate-200">
              {anomalies.length === 0 
                ? 'No Statistical Anomalies Detected' 
                : 'No PRs Match Current Filter'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {anomalies.length === 0
                ? 'All evaluated merged pull requests in this sample fell within expected size baseline boundaries (<= 1.5x median).'
                : 'Try adjusting your search query or cohort filter above.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px] select-none">
                <tr>
                  <th 
                    onClick={() => handleSort('pr_number')}
                    className="py-2.5 px-3.5 font-medium cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>PR Identifier</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('author')}
                    className="py-2.5 px-3.5 font-medium cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Author</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('size_category')}
                    className="py-2.5 px-3.5 font-medium cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Cohort</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('review_time_hours')}
                    className="py-2.5 px-3.5 font-medium text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Observed (Δt)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3.5 font-medium text-right">
                    Cohort Median (x̃)
                  </th>
                  <th 
                    onClick={() => handleSort('anomaly_ratio')}
                    className="py-2.5 px-3.5 font-medium text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Deviation</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3.5 font-medium">
                    90% CI Baseline
                  </th>
                  <th className="py-2.5 px-3.5 font-medium text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {sorted.map((item) => {
                  const isBot = (item.author || '').includes('[bot]') || (item.author || '').toLowerCase().includes('bot');
                  const ratio = item.anomaly_ratio || 0;
                  const ratioColor = ratio >= 4.0 ? 'text-rose-400 font-semibold' : 'text-amber-400 font-medium';
                  const ci = item.mock_ci_90 || [0, 0];

                  return (
                    <tr 
                      key={item.pr_number}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-medium text-blue-400">
                            #{item.pr_number}
                          </span>
                          <span className="text-slate-300 truncate max-w-[200px] sm:max-w-xs text-xs" title={item.title}>
                            {item.title}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center space-x-1.5 text-slate-300">
                          {isBot ? (
                            <Bot className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span className="truncate max-w-[110px] text-xs font-mono">
                            @{item.author}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5">
                        <span className="text-xs text-slate-300">
                          {item.size_category}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-100 tabular-nums">
                        {item.review_time_hours.toFixed(2)}h
                      </td>

                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-400 tabular-nums">
                        {item.group_median_hours.toFixed(2)}h
                      </td>

                      <td className={`py-2.5 px-3.5 text-right font-mono tabular-nums ${ratioColor}`}>
                        +{ratio.toFixed(2)}x
                      </td>

                      <td className="py-2.5 px-3.5 font-mono text-slate-400 tabular-nums text-xs">
                        [{ci[0].toFixed(2)}h – {ci[1].toFixed(2)}h]
                      </td>

                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedAnomaly(item)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs transition-colors flex items-center space-x-1 cursor-pointer"
                          >
                            <FileSearch className="w-3 h-3 text-slate-400" />
                            <span>Evidence</span>
                          </button>

                          <a
                            href={item.html_url || `https://github.com/${repoOwner}/${repoName}/pull/${item.pr_number}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                            title="Open on GitHub"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EvidenceModal
        isOpen={Boolean(selectedAnomaly)}
        onClose={() => setSelectedAnomaly(null)}
        anomaly={selectedAnomaly}
        repoOwner={repoOwner}
        repoName={repoName}
      />
    </div>
  );
}

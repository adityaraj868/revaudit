import React, { useState } from 'react';
import { PullRequestRecord, SubsystemType } from '../types';
import { PullRequestDetailModal } from './PullRequestDetailModal';
import { Search, Filter, GitPullRequest, Eye, ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck } from 'lucide-react';

interface PullRequestExplorerProps {
  pullRequests: PullRequestRecord[];
  selectedRepo: string;
  onSelectRepo: (repo: string) => void;
  repositories: string[];
}

export const PullRequestExplorer: React.FC<PullRequestExplorerProps> = ({
  pullRequests,
  selectedRepo,
  onSelectRepo,
  repositories
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('ALL');
  const [filterFirstTime, setFilterFirstTime] = useState<string>('ALL');
  const [filterBot, setFilterBot] = useState<string>('HUMAN_ONLY');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedPr, setSelectedPr] = useState<PullRequestRecord | null>(null);

  const pageSize = 20;

  const filteredPrs = pullRequests.filter(pr => {
    if (selectedRepo !== 'ALL' && pr.repo !== selectedRepo) return false;
    if (selectedSubsystem !== 'ALL' && pr.subsystem !== selectedSubsystem) return false;
    if (filterFirstTime === 'FIRST_TIME' && !pr.is_first_time_contributor) return false;
    if (filterFirstTime === 'EXPERIENCED' && pr.is_first_time_contributor) return false;
    if (filterBot === 'HUMAN_ONLY' && pr.is_bot_filtered) return false;
    if (filterBot === 'BOT_ONLY' && !pr.is_bot_filtered) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        pr.title.toLowerCase().includes(q) ||
        pr.author.toLowerCase().includes(q) ||
        pr.repo.toLowerCase().includes(q) ||
        pr.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredPrs.length / pageSize) || 1;
  const paginatedPrs = filteredPrs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-white">Pull Request Ingestion & Entity Explorer</h3>
            <span className="px-2 py-0.5 text-xs font-semibold bg-slate-800 text-teal-300 border border-slate-700 rounded-md font-mono">
              {filteredPrs.length.toLocaleString()} matching records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Browse and inspect decomposed pull requests, line-level diff comments, issue thread comments, and bot filter flags across the 15 repositories.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search */}
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

          {/* Repo Selector */}
          <select
            value={selectedRepo}
            onChange={(e) => {
              onSelectRepo(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
          >
            <option value="ALL">All 15 Repositories</option>
            {repositories.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Subsystem */}
          <select
            value={selectedSubsystem}
            onChange={(e) => {
              setSelectedSubsystem(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
          >
            <option value="ALL">All Subsystems</option>
            <option value="core">core</option>
            <option value="api">api</option>
            <option value="docs">docs</option>
            <option value="tests">tests</option>
            <option value="ui">ui</option>
          </select>

          {/* Bot filter */}
          <select
            value={filterBot}
            onChange={(e) => {
              setFilterBot(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
          >
            <option value="HUMAN_ONLY">Human PRs Only (Clean)</option>
            <option value="BOT_ONLY">Bot Signals Only (Filtered)</option>
            <option value="ALL">All Ingested PRs</option>
          </select>
        </div>
      </div>

      {/* PR Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 font-mono uppercase text-[11px]">
            <tr>
              <th className="py-3 px-4">PR Identifier & Title</th>
              <th className="py-3 px-3">Repository</th>
              <th className="py-3 px-3">Subsystem</th>
              <th className="py-3 px-3">Author</th>
              <th className="py-3 px-3 text-right">Churn (+/-)</th>
              <th className="py-3 px-3 text-right">Reviewer Load</th>
              <th className="py-3 px-3 text-right">Turnaround (Hrs)</th>
              <th className="py-3 px-3 text-center">Entities</th>
              <th className="py-3 px-4 text-center">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono">
            {paginatedPrs.map((pr) => (
              <tr key={pr.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 max-w-sm">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-teal-400">#{pr.number}</span>
                      {pr.is_bot_filtered ? (
                        <span className="px-1.5 py-0.2 text-[9px] bg-cyan-500/20 text-cyan-300 rounded">BOT</span>
                      ) : pr.is_first_time_contributor ? (
                        <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/20 text-amber-300 rounded">NEW</span>
                      ) : null}
                    </div>
                    <p className="text-slate-200 text-xs font-sans truncate" title={pr.title}>
                      {pr.title}
                    </p>
                  </div>
                </td>
                <td className="py-3 px-3 text-slate-400">{pr.repo}</td>
                <td className="py-3 px-3 uppercase text-teal-300">{pr.subsystem}</td>
                <td className="py-3 px-3 text-slate-300 font-sans">{pr.author}</td>
                <td className="py-3 px-3 text-right">
                  <span className="text-emerald-400">+{pr.lines_added}</span>
                  <span className="text-slate-500 mx-0.5">/</span>
                  <span className="text-rose-400">-{pr.lines_deleted}</span>
                </td>
                <td className="py-3 px-3 text-right font-bold text-amber-400">
                  {pr.reviewer_concurrent_workload} PRs
                </td>
                <td className="py-3 px-3 text-right font-bold text-white">
                  {pr.time_to_first_review_hrs.toFixed(1)}h
                </td>
                <td className="py-3 px-3 text-center text-slate-400 text-[10px]">
                  <span>{pr.review_count} rev</span> • <span>{pr.review_comment_count} diff</span> • <span>{pr.issue_comment_count_total} msg</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => setSelectedPr(pr)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-white transition-colors"
                    title="Inspect Decomposed Entities"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-2">
        <span>
          Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredPrs.length)} of {filteredPrs.length} records
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

      {/* Entity Details Modal */}
      <PullRequestDetailModal pr={selectedPr} onClose={() => setSelectedPr(null)} />
    </div>
  );
};

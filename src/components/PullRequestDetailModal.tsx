import React from 'react';
import { X, GitPullRequest, MessageSquare, Code, CheckCircle, Clock, ShieldCheck, User, AlertCircle, FileCode } from 'lucide-react';
import { PullRequestRecord } from '../types';

interface PullRequestDetailModalProps {
  pr: PullRequestRecord | null;
  onClose: () => void;
}

export const PullRequestDetailModal: React.FC<PullRequestDetailModalProps> = ({ pr, onClose }) => {
  if (!pr) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-slate-850 px-6 py-4 border-b border-slate-800 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-teal-400 font-bold text-sm">
                {pr.repo} #{pr.number}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full border ${
                pr.is_merged 
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' 
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}>
                {pr.is_merged ? 'MERGED' : 'CLOSED'}
              </span>
              {pr.is_bot_filtered && (
                <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-full">
                  BOT FILTERED
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white leading-snug">
              {pr.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs text-slate-300 max-h-[75vh] overflow-y-auto">
          {/* Decomposed Entity Breakdown */}
          <div>
            <h4 className="text-xs font-mono uppercase text-slate-400 font-semibold mb-3 flex items-center space-x-2">
              <GitPullRequest className="h-4 w-4 text-teal-400" />
              <span>Entity Separation & Tracked Confounders</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Author:</span>
                <span className="text-white font-bold">{pr.author}</span>
                <span className="text-[10px] text-slate-400 block">{pr.author_association}</span>
              </div>

              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Subsystem:</span>
                <span className="text-teal-300 font-bold uppercase">{pr.subsystem}</span>
                <span className="text-[10px] text-slate-400 block">{pr.files_changed} files changed</span>
              </div>

              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Code Churn:</span>
                <span className="text-emerald-400 font-bold">+{pr.lines_added}</span>
                <span className="text-rose-400 font-bold ml-1">-{pr.lines_deleted}</span>
              </div>

              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Reviewer Load:</span>
                <span className="text-amber-400 font-bold">{pr.reviewer_concurrent_workload} active PRs</span>
                <span className="text-[10px] text-slate-400 block">at event timestamp</span>
              </div>
            </div>
          </div>

          {/* Measured Outcomes */}
          <div>
            <h4 className="text-xs font-mono uppercase text-slate-400 font-semibold mb-3 flex items-center space-x-2">
              <Clock className="h-4 w-4 text-indigo-400" />
              <span>Measured Process Outcomes</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Time to First Human Review:</span>
                <span className="text-xl font-bold text-amber-400">{pr.time_to_first_review_hrs.toFixed(1)} hrs</span>
              </div>

              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Total Review Iterations:</span>
                <span className="text-xl font-bold text-slate-200">{pr.total_review_rounds} rounds</span>
              </div>

              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Changes Requested:</span>
                <span className={`text-xl font-bold ${pr.was_changes_requested ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {pr.was_changes_requested ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
          </div>

          {/* Reviews & Comments Entity Tree */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-mono uppercase text-slate-400 font-semibold flex items-center space-x-2">
              <FileCode className="h-4 w-4 text-emerald-400" />
              <span>Decomposed Entity Signals</span>
            </h4>

            <div className="space-y-2">
              {/* Review Signal */}
              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white font-mono">PullRequestReview</span>
                    <span className="px-1.5 py-0.5 text-[9px] bg-teal-500/20 text-teal-300 rounded font-mono">
                      Human Reviewer
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    State: <span className="font-mono text-teal-300 font-bold">{pr.was_changes_requested ? 'CHANGES_REQUESTED' : 'APPROVED'}</span>
                  </p>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">{pr.time_to_first_review_hrs.toFixed(1)}h latency</span>
              </div>

              {/* Bot Review Signal */}
              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 flex items-start justify-between opacity-80">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-cyan-300 font-mono">Automated CI/Bot Review</span>
                    <span className="px-1.5 py-0.5 text-[9px] bg-cyan-500/20 text-cyan-300 rounded font-mono">
                      Isolated by Bot Filter
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Automated lint & test execution stripped from human latency calculation.
                  </p>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">0.1h latency</span>
              </div>

              {/* Line Diff Comments */}
              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
                <div>
                  <span className="font-bold text-white">ReviewComment Entities (Diff lines):</span>
                  <span className="text-slate-400 ml-2">{pr.inline_comment_count} comments attached to code diff</span>
                </div>
                <span className="text-teal-400">{pr.inline_comment_count} lines reviewed</span>
              </div>

              {/* Thread Comments */}
              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
                <div>
                  <span className="font-bold text-white">IssueComment Entities (Discussion):</span>
                  <span className="text-slate-400 ml-2">{pr.issue_comment_count} conversational messages</span>
                </div>
                <span className="text-slate-300">{pr.issue_comment_count} msgs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-850 px-6 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors font-mono"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

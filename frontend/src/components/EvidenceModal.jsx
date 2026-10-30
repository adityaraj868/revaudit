import React from 'react';
import { 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Scale
} from 'lucide-react';

export default function EvidenceModal({ isOpen, onClose, anomaly, repoOwner, repoName }) {
  if (!isOpen || !anomaly) return null;

  const prNumber = anomaly.pr_number;
  const title = anomaly.title || `Pull Request #${prNumber}`;
  const author = anomaly.author || 'contributor';
  const sizeCategory = anomaly.size_category || 'Small';
  const changedLines = anomaly.changed_lines ?? 'unknown';
  const reviewTime = anomaly.review_time_hours;
  const medianHours = anomaly.group_median_hours;
  const residual = anomaly.standardized_residual;
  const htmlUrl = anomaly.html_url || `https://github.com/${repoOwner}/${repoName}/pull/${prNumber}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-white">
                  Statistical Evidence Dossier
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  PR #{prNumber}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                {repoOwner}/{repoName} • Size-Controlled Outlier Inspection
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - 6 Level Credibility Hierarchy */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          
          {/* PR Header Banner */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-100 font-semibold text-sm truncate">
                {title}
              </span>
              <a
                href={htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 shrink-0 ml-2 text-[11px]"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
              <span>Author: <strong className="text-slate-300">@{author}</strong></span>
              <span>•</span>
              <span>Code scope: <strong className="text-blue-400">{sizeCategory}</strong> ({changedLines} changed lines)</span>
              <span>•</span>
              <span>First review: <strong className="text-rose-400">{reviewTime?.toFixed(2) ?? '—'}h</strong></span>
            </div>
          </div>

          {/* 6-Part Hierarchy Grid */}
          <div className="space-y-3 font-mono">
            
            {/* 1. Finding */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-amber-400 uppercase font-semibold block mb-1">
                1. Statistical Finding
              </span>
              <p className="text-slate-300 text-xs leading-relaxed font-sans">
                First human review arrived after <strong className="text-slate-100">{reviewTime?.toFixed(2) ?? '—'} hours</strong>. The adjusted robust model residual is <strong>{residual > 0 ? '+' : ''}{residual?.toFixed(2) ?? '—'}</strong> standard deviations from expected latency. This is a process triage signal, not a quality judgment.
              </p>
            </div>

            {/* 2. Measured Evidence & 3. Estimate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-blue-400 uppercase font-semibold block mb-1">
                  2. Measured Evidence
                </span>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Time to first human review:</span>
                    <strong className="text-white">{reviewTime?.toFixed(2) ?? '—'}h</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Unadjusted cohort median:</span>
                    <span>{medianHours?.toFixed(2) ?? 'Not reached'}h</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-rose-400 uppercase font-semibold block mb-1">
                  3. Estimate &amp; Deviation
                </span>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Robust residual:</span>
                    <strong className="text-rose-400 font-bold">{residual > 0 ? '+' : ''}{residual?.toFixed(2) ?? '—'}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Signal direction:</span>
                    <span>{anomaly.anomaly_direction?.replaceAll('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Classification:</span>
                    <span className="text-amber-300">Triage signal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Uncertainty & 5. Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-blue-400 uppercase font-semibold block mb-1">
                  4. Sampling Uncertainty
                </span>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>95% cohort interval:</span>
                    <strong className="text-blue-300">Not attached to this model residual</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Model:</span>
                    <span>Huber robust regression</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-sans mt-1">
                    Cohort intervals use bootstrap Kaplan–Meier estimates when sample size permits.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-emerald-400 uppercase font-semibold block mb-1">
                  5. Confounder Controls Applied
                </span>
                <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside font-sans">
                  <li><strong>PR scope:</strong> {changedLines} changed lines and {anomaly.files_changed ?? 'unknown'} files</li>
                  <li><strong>Censoring:</strong> Open and unreviewed PRs remain in survival estimates</li>
                  <li><strong>Reviewers:</strong> Human review events only; bots excluded</li>
                </ul>
              </div>
            </div>

            {/* 6. Interpretation & Responsible Guidance */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>6. Qualitative Interpretation &amp; Safeguards</span>
              </span>
              <p className="text-slate-300 text-xs leading-relaxed font-sans">
                This anomaly indicates a process or queueing bottleneck during the review lifecycle (e.g. delayed initial triage, waiting on CI tests, or review delegation lag). 
                <strong> This is NOT evidence of individual reviewer negligence or lack of contributor skill.</strong> Statistical audits are intended to identify organizational friction, not assign personal blame.
              </p>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            RevAudit Empirical Evaluation Framework
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}

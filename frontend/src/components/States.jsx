import React from 'react';
import { RefreshCw, AlertTriangle, Search } from 'lucide-react';

export function LoadingState({ repo = '' }) {
  return (
    <div className="p-12 rounded-2xl border border-slate-800 bg-slate-900/90 text-center space-y-4 shadow-sm animate-fade-in">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
          Executing Statistical Audit for {repo || 'Repository'}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed font-sans">
          Querying recent closed pull requests from GitHub REST API v3, filtering unmerged branches, computing size-controlled medians, and calculating 90% confidence intervals...
        </p>
      </div>

      <div className="inline-flex items-center space-x-2 text-[11px] font-mono text-cyan-400/80 bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-800/40">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
        <span>Survival Imputation • Stratification • 1.5x Anomaly Filter</span>
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3 font-mono text-xs animate-fade-in">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-rose-300 uppercase tracking-wide">
            Audit Request Encountered An Error
          </h4>
          <p className="text-slate-300 font-sans text-xs leading-relaxed">
            {error || 'Unable to retrieve repository data from GitHub REST API or RevAudit backend.'}
          </p>
          <p className="text-slate-400 text-[11px] pt-1">
            Tip: Verify that the repository name follows the <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">owner/repo</code> syntax (e.g. <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">fastapi/fastapi</code>) and check if GitHub API rate limits apply.
          </p>
        </div>
      </div>

      {onRetry && (
        <div className="pt-2 border-t border-rose-500/20 flex justify-end">
          <button
            onClick={onRetry}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Retry Request
          </button>
        </div>
      )}
    </div>
  );
}

export function EmptyAuditState({ onSampleClick }) {
  return (
    <div className="p-10 rounded-2xl border border-slate-800 bg-slate-900/90 text-center space-y-4 font-mono text-xs">
      <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
        <Search className="w-5 h-5" />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">
          Ready to Audit GitHub Repository
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans leading-relaxed">
          Enter any public GitHub repository URL or slug to calculate size-controlled turnaround baselines and detect review anomalies.
        </p>
      </div>

      {onSampleClick && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <span className="text-slate-500 text-[11px]">Quick Audits:</span>
          {['fastapi/fastapi', 'pallets/flask', 'psf/requests', 'django/django'].map((slug) => (
            <button
              key={slug}
              onClick={() => onSampleClick(slug)}
              className="px-2.5 py-1 rounded bg-slate-950 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 text-[11px] transition-colors cursor-pointer"
            >
              {slug}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

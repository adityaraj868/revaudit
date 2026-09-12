import React from 'react';
import { 
  Sparkles, 
  FileText, 
  ArrowRight, 
  BarChart3, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Database, 
  Users, 
  Code, 
  ExternalLink,
  ShieldAlert,
  GitPullRequest
} from 'lucide-react';

export default function HomeView({ onNavigate, onQuickAudit }) {
  return (
    <div className="space-y-12 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-indigo-700/30">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/20 border border-indigo-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-indigo-200">
            <span>Academic Lab Project • Dr. Sukhpal Singh</span>
            <span className="text-indigo-400">•</span>
            <span>Team ArchCoders</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Empirical Code Review Effort Analytics
          </h1>

          <p className="text-indigo-100/90 text-base sm:text-lg leading-relaxed">
            Measuring code review consistency by controlling for pull request complexity and reviewer workload. 
            RevAudit ingests live GitHub PR histories to eliminate invisible variation and flag statistically significant review bottlenecks.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('project')}
              className="inline-flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-md transition-all cursor-pointer group"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Launch Main Project</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('presentation')}
              className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 px-6 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-indigo-300" />
              <span>View Presentation Deck</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Highlights / 3 Pillars */}
      <section className="space-y-4">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Why RevAudit?</h2>
          <p className="text-sm text-slate-500 mt-1">
            Raw "time-to-merge" metrics fail because they treat a 10-line fix the same as a 2,000-line refactor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Size-Controlled Cohorts</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Stratifies PRs into Small (&lt;250 chars), Medium (250–1000 chars), and Large (&gt;1000 chars) cohorts using description complexity proxies. Small PRs are only benchmarked against other small PRs.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Non-Parametric Medians</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Software review turnaround follows heavy-tailed log-normal distributions. RevAudit utilizes medians rather than arithmetic means to resist skewness, paired with 90% confidence intervals.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">1.5× Anomaly Multiplier</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Flags any pull request whose review duration exceeds 1.5× of its specific cohort median, reporting the exact variance ratio (e.g. 9.1× median) for qualitative engineering leadership review.
            </p>
          </div>
        </div>
      </section>

      {/* Analytical Pipeline Workflow */}
      <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">How RevAudit Operates</h3>
            <p className="text-xs text-slate-500">Continuous 4-stage empirical analysis pipeline</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step 1</span>
            <h4 className="font-semibold text-slate-900 mt-1 mb-1">Live Ingestion</h4>
            <p className="text-xs text-slate-600">
              Queries GitHub REST API v3 for the 30 most recently closed pull requests without mock/fake data.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Step 2</span>
            <h4 className="font-semibold text-slate-900 mt-1 mb-1">Survival Imputation</h4>
            <p className="text-xs text-slate-600">
              Discards unmerged/abandoned branches to prevent survival bias from distorting review effort.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">Step 3</span>
            <h4 className="font-semibold text-slate-900 mt-1 mb-1">Stratification</h4>
            <p className="text-xs text-slate-600">
              Clusters merged PRs into Small, Medium, and Large cohorts and calculates non-parametric medians.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Step 4</span>
            <h4 className="font-semibold text-slate-900 mt-1 mb-1">Anomaly Detection</h4>
            <p className="text-xs text-slate-600">
              Computes 90% confidence intervals and flags PRs taking &gt; 1.5× group median with variance ratios.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Launch Card */}
      <section className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-xl font-bold text-slate-900">Try It Live with Sample Repositories</h3>
          <p className="text-sm text-slate-600 max-w-xl">
            Test the live audit engine right now. Select any repository below to open the Main Project and execute the audit:
          </p>
          <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
            {['fastapi/fastapi', 'pallets/flask', 'psf/requests', 'django/django'].map((repo) => (
              <button
                key={repo}
                onClick={() => onQuickAudit(repo)}
                className="text-xs bg-white hover:bg-indigo-600 hover:text-white text-slate-700 font-mono font-medium px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                {repo}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onNavigate('project')}
          className="shrink-0 inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-xs transition-colors cursor-pointer"
        >
          <span>Open Main Project</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
}

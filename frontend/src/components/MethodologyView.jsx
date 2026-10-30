import React, { useState } from 'react';
import { 
  Layers, 
  GitPullRequest, 
  Filter, 
  AlertTriangle, 
  Scale, 
  Cpu, 
  Code2,
  Users,
  ShieldCheck,
  FileDown
} from 'lucide-react';
import PageHeader from './PageHeader';
import UMLDiagramViewer from './UMLDiagramViewer';

export default function MethodologyView() {
  const [activeStep, setActiveStep] = useState(1);

  const pipelineSteps = [
    {
      step: 1,
      name: 'Ingestion & Triage',
      title: '1. Live, Paginated GitHub REST API Ingestion',
      subtitle: 'Paginated sample of recent open and closed pull requests',
      icon: GitPullRequest,
      content: (
        <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
          <p>
            RevAudit queries GitHub's REST API with <code className="text-blue-300 font-mono">state=all</code>, follows Link-header pagination, and enriches sampled pull requests with change statistics and review timeline events. Authenticated users can analyze private repositories and receive a larger rate-limit budget; the sample window and audit timestamp are returned with the results.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
            <span className="text-blue-400 font-semibold block">// API Client Parameter Spec</span>
            <div>Endpoint: <span className="text-slate-200">https://api.github.com/repos/:owner/:repo/pulls</span></div>
            <div>Headers: <span className="text-slate-400">Accept: application/vnd.github.v3+json, User-Agent</span></div>
            <div>Pagination: <span className="text-slate-400">Link-header traversal with incremental sync stop</span></div>
            <div>Rate-Limit Handling: <span className="text-amber-400">HTTP 403 handling / X-RateLimit inspection</span></div>
          </div>
        </div>
      )
    },
    {
      step: 2,
      name: 'Censoring',
      title: '2. Include Open and Unmerged PRs',
      subtitle: 'Right-censor PRs without a first review',
      icon: Filter,
      content: (
        <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
          <p>
            Open pull requests without a first human review are censored at audit time; closed unmerged PRs are censored at closure. Both remain in Kaplan–Meier latency estimates instead of being discarded or treated as completed review events.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1.5">
            <span className="text-emerald-400 font-semibold block">Mathematical Invariant:</span>
            <div className="text-slate-200">
              Event = first non-bot human review; otherwise observation is right-censored.
            </div>
            <div className="text-slate-400 text-[10px]">
              The primary outcome is elapsed time from review eligibility to first human review.
            </div>
          </div>
        </div>
      )
    },
    {
      step: 3,
      name: 'Size Cohorts',
      title: '3. PR Complexity Stratification',
      subtitle: 'Coarse scope controls using changed lines and files',
      icon: Layers,
      content: (
        <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
          <p>
            Per-PR detail provides additions, deletions, and changed file counts. These coarse measures define scope cohorts; missing values are kept in an explicit Unknown cohort.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-blue-400 font-semibold block">Small Cohort</span>
              <span className="text-slate-400 text-[10px]">≤100 changed lines and ≤5 files</span>
              <p className="text-slate-300 text-[10px] mt-1 font-sans">Minor bugfixes, typos, documentation updates</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-blue-400 font-semibold block">Medium Cohort</span>
              <span className="text-slate-400 text-[10px]">≤1,000 lines and ≤20 files</span>
              <p className="text-slate-300 text-[10px] mt-1 font-sans">Standard feature updates, routine components</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-blue-400 font-semibold block">Large Cohort</span>
              <span className="text-slate-400 text-[10px]">Above either medium cutoff</span>
              <p className="text-slate-300 text-[10px] mt-1 font-sans">Major subsystem refactors, database migrations</p>
            </div>
          </div>
        </div>
      )
    },
    {
      step: 4,
      name: 'Kaplan–Meier & CI₉₅',
      title: '4. Censoring-Aware Median & Bootstrap Interval',
      subtitle: 'Non-parametric estimate with uncertainty when support permits',
      icon: Scale,
      content: (
        <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
          <p>
            Kaplan–Meier estimates the first-review latency distribution while retaining right-censored records. A percentile bootstrap 95% interval is shown only when cohort size and event support are sufficient; otherwise the interval is reported unavailable.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1.5">
            <div className="text-blue-300">
              $$\tilde&#123;x&#125;_C = \text&#123;Median&#125;(\&#123; \Delta t_i \mid \text&#123;PR&#125;_i \in C \&#125;)$$
            </div>
            <div className="text-slate-300">
              CI₉₅ = percentile bootstrap interval of the Kaplan–Meier median
            </div>
          </div>
        </div>
      )
    },
    {
      step: 5,
      name: 'Adjusted Triage',
      title: '5. Robust Adjusted Process Signals',
      subtitle: 'Compare observed latency with a robust conditional expectation',
      icon: AlertTriangle,
      content: (
        <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
          <p>
            Huber robust regression models log first-review latency using change churn, changed files, first-time contributor status, and recent reviewer activity. Residuals with absolute robust z-score at least 2.5 are shown as triage signals in either direction. This model is unavailable below the stated minimum sample size.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1.5">
            <div className="text-amber-300">
              Flag for process review when |robust residual z| ≥ 2.5
            </div>
            <div className="text-slate-400">
              $$\text&#123;Variance Ratio &#125; \mathcal&#123;R&#125;_i = \frac&#123;\Delta t_i&#125;&#123;\tilde&#123;x&#125;_C&#125;$$
            </div>
          </div>
        </div>
      )
    },
    {
      step: 6,
      name: 'Reviewer Workload',
      title: '6. Review Events & Queue Workload',
      subtitle: 'Measuring reviewer context at first review',
      icon: Users,
      content: (
        <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
          <p>
            Each merged PR stores its GitHub review events. For the first review, RevAudit counts other PRs previously reviewed by that reviewer that were still open at the event timestamp.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1.5">
            <span className="text-teal-400 font-semibold block">Why this step exists:</span>
            <div className="text-slate-300">Raw review duration mixes code complexity with queue pressure. The workload snapshot provides a transparent context variable without claiming access to private assignment data.</div>
            <div className="text-slate-400">Output: first-review latency, concurrent workload, review count, review rounds, and workload correlation.</div>
          </div>
        </div>
      )
    },
    {
      step: 7,
      name: 'Access & Reporting',
      title: '7. OAuth Access & PDF Reporting',
      subtitle: 'Secure user-scoped access and portable results',
      icon: ShieldCheck,
      content: (
        <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
          <p>
            Optional GitHub OAuth supplies a user-scoped token for private or rate-limited repositories. The backend validates OAuth state and encrypts the token in a server-side session. The current audit payload can then be exported through the ReportLab PDF endpoint.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1.5">
            <div><span className="text-blue-400">Auth:</span> <span className="text-slate-300">GET /auth/github/login → /auth/github/callback</span></div>
            <div><span className="text-orange-400">Report:</span> <span className="text-slate-300">POST /api/reports/pdf → downloadable audit.pdf</span></div>
            <div><FileDown className="inline w-3 h-3 mr-1 text-orange-400" />The report preserves baselines, workload summary, and anomalies shown in the dashboard.</div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Methodology &amp; System Architecture"
        subtitle="The seven-stage ingestion, statistical, workload, access, and reporting pipeline"
        badges={[
          { label: 'Non-Parametric Medians', color: 'bg-slate-800 text-slate-300 border-slate-700' },
          { label: 'Bootstrap 95% CI', color: 'bg-slate-800 text-slate-300 border-slate-700' },
          { label: 'Adjusted residual triage', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }
        ]}
      />

      {/* 7-Stage Pipeline Interactive Walkthrough */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 space-y-5">
        <div>
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-orange-400" />
            <span>Seven-Stage RevAudit Implementation Pipeline</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            From paginated GitHub PRs to censoring-aware queue latency and adjusted process triage.
          </p>
        </div>

        {/* Pipeline Step Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 font-mono text-xs">
          {pipelineSteps.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.step;
            return (
              <button
                key={step.step}
                onClick={() => setActiveStep(step.step)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  isActive
                    ? 'bg-orange-500/10 border-orange-500/40 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-orange-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}>
                    0{step.step}
                  </span>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-500'}`} />
                </div>
                <span className="font-sans font-medium text-xs truncate">{step.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active Step Detailed Content Pane */}
        {(() => {
          const current = pipelineSteps.find(s => s.step === activeStep) || pipelineSteps[0];
          return (
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    {current.title}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-sans">
                    {current.subtitle}
                  </span>
                </div>
                <span className="text-xs font-mono font-medium text-orange-400 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                  Stage {current.step} of 7
                </span>
              </div>
              {current.content}
            </div>
          );
        })()}
      </div>

      {/* UML Architectural Suite Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-blue-400" />
              <span>PlantUML Architecture &amp; Sequence Diagrams</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Authored by Dheeraj (UML &amp; Architecture Lead) • UCS503 Software Engineering.
            </p>
          </div>
        </div>

        <UMLDiagramViewer initialDiagramId="04_sequence_pandas_baseline" />
      </div>
    </div>
  );
}

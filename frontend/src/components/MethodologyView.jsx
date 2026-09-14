import React, { useState } from 'react';
import { 
  Layers, 
  GitPullRequest, 
  Filter, 
  AlertTriangle, 
  Scale, 
  Cpu, 
  Code2
} from 'lucide-react';
import PageHeader from './PageHeader';
import UMLDiagramViewer from './UMLDiagramViewer';

export default function MethodologyView() {
  const [activeStep, setActiveStep] = useState(1);

  const pipelineSteps = [
    {
      step: 1,
      name: 'Ingestion & Triage',
      title: '1. Live GitHub REST API Ingestion',
      subtitle: 'Non-destructive querying of recent closed pull requests',
      icon: GitPullRequest,
      content: (
        <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
          <p>
            RevAudit queries GitHub's public REST API v3 (<code className="text-blue-300 font-mono">/repos/&#123;owner&#125;/&#123;repo&#125;/pulls?state=closed&amp;per_page=30</code>) to retrieve live closed pull request histories without requiring write permissions or invasive webhook installation.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
            <span className="text-blue-400 font-semibold block">// API Client Parameter Spec</span>
            <div>Endpoint: <span className="text-slate-200">https://api.github.com/repos/:owner/:repo/pulls</span></div>
            <div>Headers: <span className="text-slate-400">Accept: application/vnd.github.v3+json, User-Agent</span></div>
            <div>Rate-Limit Handling: <span className="text-amber-400">HTTP 403 backoff / X-RateLimit inspection</span></div>
          </div>
        </div>
      )
    },
    {
      step: 2,
      name: 'Survival Correction',
      title: '2. Survival Bias Correction (Imputation)',
      subtitle: 'Discarding unmerged PRs to isolate completed review lifecycles',
      icon: Filter,
      content: (
        <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
          <p>
            Pull requests that are closed without being merged represent rejected proposals, duplicate work, or abandoned experiments. Incorporating their turnaround times skews true code review latency baselines.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1.5">
            <span className="text-emerald-400 font-semibold block">Mathematical Invariant:</span>
            <div className="text-slate-200">
              $$\mathcal&#123;D&#125;_\&#123;\text&#123;merged&#125;\&#125; = \&#123; \text&#123;PR&#125;_i \in \mathcal&#123;D&#125;_\&#123;\text&#123;raw&#125;\&#125; \mid \text&#123;merged\_at&#125;_i \neq \text&#123;null&#125; \&#125;$$
            </div>
            <div className="text-slate-400 text-[10px]">
              Review duration Δt_i = (Timestamp(merged_at_i) - Timestamp(created_at_i)) / 3600 seconds.
            </div>
          </div>
        </div>
      )
    },
    {
      step: 3,
      name: 'Size Cohorts',
      title: '3. PR Complexity Stratification',
      subtitle: 'Controlling for review scope using description length proxy',
      icon: Layers,
      content: (
        <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
          <p>
            Because summary REST API lists omit file line diffs without per-PR queries, description character length (<code className="text-blue-300 font-mono">L_body</code>) provides an effective proxy for architectural scope and review complexity:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-blue-400 font-semibold block">Small Cohort</span>
              <span className="text-slate-400 text-[10px]">L_body &lt; 250 chars</span>
              <p className="text-slate-300 text-[10px] mt-1 font-sans">Minor bugfixes, typos, documentation updates</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-blue-400 font-semibold block">Medium Cohort</span>
              <span className="text-slate-400 text-[10px]">250 ≤ L_body &lt; 1000</span>
              <p className="text-slate-300 text-[10px] mt-1 font-sans">Standard feature updates, routine components</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-blue-400 font-semibold block">Large Cohort</span>
              <span className="text-slate-400 text-[10px]">L_body ≥ 1000 chars</span>
              <p className="text-slate-300 text-[10px] mt-1 font-sans">Major subsystem refactors, database migrations</p>
            </div>
          </div>
        </div>
      )
    },
    {
      step: 4,
      name: 'Medians & CI₉₀',
      title: '4. Non-Parametric Median & 90% Confidence Intervals',
      subtitle: '50% breakdown-point resistance against extreme outliers',
      icon: Scale,
      content: (
        <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
          <p>
            Review duration distributions in software engineering are heavy-tailed and right-skewed. Arithmetic means (μ) are easily distorted by extreme PRs (e.g. PR open for 3 months). The median ($\tilde&#123;x&#125;_C$) guarantees 50% breakdown resistance:
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1.5">
            <div className="text-blue-300">
              $$\tilde&#123;x&#125;_C = \text&#123;Median&#125;(\&#123; \Delta t_i \mid \text&#123;PR&#125;_i \in C \&#125;)$$
            </div>
            <div className="text-slate-300">
              $$CI_&#123;90&#125;(C) = \left[ \max\left(0,\; \tilde&#123;x&#125;_C - 1.645 \cdot \frac&#123;s_C&#125;&#123;\sqrt&#123;n_C&#125;&#125;\right),\; \tilde&#123;x&#125;_C + 1.645 \cdot \frac&#123;s_C&#125;&#123;\sqrt&#123;n_C&#125;&#125; \right]$$
            </div>
          </div>
        </div>
      )
    },
    {
      step: 5,
      name: '1.5x Anomaly Rule',
      title: '5. 1.5× Anomaly Threshold Multiplier',
      subtitle: 'Flagging review deviations relative to cohort-specific baselines',
      icon: AlertTriangle,
      content: (
        <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
          <p>
            An individual pull request $\text&#123;PR&#125;_i$ is flagged as an anomaly if its review duration exceeds 1.5× the median of its specific size cohort ($\tilde&#123;x&#125;_C$):
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1.5">
            <div className="text-amber-300">
              $$\text&#123;IsAnomaly&#125;(\text&#123;PR&#125;_i) = \begin&#123;cases&#125; \text&#123;True&#125; &amp; \text&#123;if &#125; \Delta t_i &gt; 1.5 \times \tilde&#123;x&#125;_C \\ \text&#123;False&#125; &amp; \text&#123;otherwise&#125; \end&#123;cases&#125;$$
            </div>
            <div className="text-slate-400">
              $$\text&#123;Variance Ratio &#125; \mathcal&#123;R&#125;_i = \frac&#123;\Delta t_i&#125;&#123;\tilde&#123;x&#125;_C&#125;$$
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Methodology &amp; System Architecture"
        subtitle="The five-stage statistical data processing pipeline and complete PlantUML architectural model suite"
        badges={[
          { label: 'Non-Parametric Medians', color: 'bg-slate-800 text-slate-300 border-slate-700' },
          { label: '90% CI Bounds', color: 'bg-slate-800 text-slate-300 border-slate-700' },
          { label: '1.5x Multiplier', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }
        ]}
      />

      {/* 5-Stage Pipeline Interactive Walkthrough */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 space-y-5">
        <div>
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>Five-Stage Statistical Analysis Pipeline</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            From raw GitHub JSON events to size-controlled anomaly classification with confidence bounds.
          </p>
        </div>

        {/* Pipeline Step Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
          {pipelineSteps.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.step;
            return (
              <button
                key={step.step}
                onClick={() => setActiveStep(step.step)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  isActive
                    ? 'bg-blue-600/15 border-blue-500/50 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    0{step.step}
                  </span>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
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
                <span className="text-xs font-mono font-medium text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                  Stage {current.step} of 5
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

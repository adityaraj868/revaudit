import React from 'react';
import { 
  ShieldCheck, 
  UserX, 
  Scale, 
  Eye, 
  HelpCircle, 
  Lock, 
  CheckCircle2 
} from 'lucide-react';
import PageHeader from './PageHeader';

export default function EthicalSafeguardsView() {
  const safeguards = [
    {
      title: '1. No Individual Verdicts or Developer Rankings',
      icon: UserX,
      badge: 'Protected',
      desc: 'RevAudit explicitly evaluates organizational review processes and queue latency. It never creates individual developer performance rankings, personal blame metrics, or punitive scorecards.'
    },
    {
      title: '2. Patterns Over Accusations',
      icon: Scale,
      badge: 'Process Health',
      desc: 'Statistical anomalies reflect potential review bottlenecks (e.g. CI pipeline delays, cross-timezone handoffs, architectural discussions), requiring human context rather than immediate fault attribution.'
    },
    {
      title: '3. Explicit Sampling Uncertainty',
      icon: Eye,
      badge: '90% CI Bounds',
      desc: 'All statistical findings are accompanied by 90% confidence interval margins. Cohorts with small sample sizes are highlighted with explicit caveats to prevent overconfident conclusions.'
    },
    {
      title: '4. Non-Parametric Resistance',
      icon: ShieldCheck,
      badge: '50% Breakdown Point',
      desc: 'Using group medians rather than arithmetic means guarantees that isolated, long-running pull requests do not distort repository-wide baselines.'
    },
    {
      title: '5. Human-in-the-Loop Verification',
      icon: HelpCircle,
      badge: 'Triage Assistance',
      desc: 'Automated anomaly detection serves purely as a qualitative triage filter for engineering leads. Final judgments always require direct inspection of commit logs and discussion threads.'
    },
    {
      title: '6. Open Research & Reproducibility',
      icon: Lock,
      badge: 'Open Science',
      desc: 'All mathematical formulations, size stratification boundaries, and outlier heuristics are fully documented, inspectable, and open for academic peer review.'
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ethical Safeguards &amp; Research Boundaries"
        subtitle="Core responsible engineering policies governing statistical analysis in RevAudit"
        badges={[
          { label: 'Ethical AI / ML Policy', color: 'bg-slate-800 text-slate-300 border-slate-700' },
          { label: 'Human-in-the-Loop', color: 'bg-slate-800 text-slate-300 border-slate-700' }
        ]}
      />

      {/* Ethical Safeguards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {safeguards.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <h3 className="text-xs font-semibold text-slate-200">
                      {item.title}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center space-x-1.5 text-[10px] font-mono text-slate-500">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Enforced in RevAudit analytical engine</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Academic Lab Commitment */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-950 space-y-2 text-xs">
        <span className="text-slate-300 font-semibold uppercase text-[11px] block tracking-wider">
          Academic Research Integrity Statement
        </span>
        <p className="text-slate-400 font-sans leading-relaxed">
          RevAudit was developed by Team ArchCoders as part of the UCS503 Software Engineering Laboratory. The software is designed strictly as an observability research instrument to study code review consistency and reviewer workload distribution in open-source projects.
        </p>
      </div>
    </div>
  );
}

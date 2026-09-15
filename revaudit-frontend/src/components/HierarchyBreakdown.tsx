import React from 'react';
import { Layers, GitPullRequest, User, Database, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ModelCoefficients } from '../types/audit';

interface HierarchyBreakdownProps {
  coefficients?: ModelCoefficients;
}

export const HierarchyBreakdown: React.FC<HierarchyBreakdownProps> = ({ coefficients }) => {
  const coeff = coefficients || {
    intercept_beta_0: 12.8,
    lines_added_beta_1: 0.015,
    workload_beta_2: 3.12,
    first_time_beta_3: 5.2,
    r_squared: 0.64,
    f_pvalue: 0.0001
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-bold text-white">3-Level Hierarchical Model Specification</h3>
          <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md font-mono">
            Variance Decomposition
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          To eliminate ecological fallacy, variance in review latency is partitioned across three nested levels: Pull Request observation, Reviewer bandwidth capacity, and Repository governance culture.
        </p>
      </div>

      {/* 3 Level Hierarchy Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Level 1: Observation (PR) */}
        <div className="p-5 bg-slate-850 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg">
                <GitPullRequest className="h-4 w-4" />
              </div>
              <span className="font-bold text-white font-mono text-sm">Level 1: Observation</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              PR Covariates
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Individual patch attributes controlled during modeling:
          </p>

          <ul className="space-y-1.5 text-xs font-mono text-slate-400">
            <li className="flex justify-between">
              <span>Lines Added (β₁):</span>
              <span className="text-teal-300 font-bold">+{coeff.lines_added_beta_1.toFixed(3)}h/line</span>
            </li>
            <li className="flex justify-between">
              <span>Files Changed:</span>
              <span className="text-teal-300 font-bold">+0.65h/file</span>
            </li>
            <li className="flex justify-between">
              <span>First-Time Author (β₃):</span>
              <span className="text-amber-300 font-bold">+{coeff.first_time_beta_3.toFixed(2)}h delay</span>
            </li>
          </ul>
        </div>

        {/* Level 2: Reviewer Cluster */}
        <div className="p-5 bg-slate-850 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-teal-500/20 text-teal-400 rounded-lg">
                <User className="h-4 w-4" />
              </div>
              <span className="font-bold text-white font-mono text-sm">Level 2: Reviewer</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Random Intercept u₀ⱼ
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Reviewer concurrency load &amp; baseline availability random effects:
          </p>

          <ul className="space-y-1.5 text-xs font-mono text-slate-400">
            <li className="flex justify-between">
              <span>Workload Saturation (β₂):</span>
              <span className="text-rose-400 font-bold">+{coeff.workload_beta_2.toFixed(2)}h/PR</span>
            </li>
            <li className="flex justify-between">
              <span>Reviewer Variance (σ²):</span>
              <span className="text-slate-200 font-bold">14.20 h²</span>
            </li>
            <li className="flex justify-between">
              <span>ICC Reviewer:</span>
              <span className="text-teal-300 font-bold">24.1% of variance</span>
            </li>
          </ul>
        </div>

        {/* Level 3: Repository Cluster */}
        <div className="p-5 bg-slate-850 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                <Database className="h-4 w-4" />
              </div>
              <span className="font-bold text-white font-mono text-sm">Level 3: Repository</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Governance v₀₀ₖ
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Cross-repository governance, CI suite runtime, and quorum requirements:
          </p>

          <ul className="space-y-1.5 text-xs font-mono text-slate-400">
            <li className="flex justify-between">
              <span>Global Intercept (γ₀₀₀):</span>
              <span className="text-white font-bold">{coeff.intercept_beta_0.toFixed(2)}h base</span>
            </li>
            <li className="flex justify-between">
              <span>Repo Variance (σ²_repo):</span>
              <span className="text-slate-200 font-bold">28.50 h²</span>
            </li>
            <li className="flex justify-between">
              <span>ICC Repository:</span>
              <span className="text-indigo-300 font-bold">48.2% of variance</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Formula Representation */}
      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="text-slate-300">
          <span className="text-teal-400 font-bold">Model Equation:</span> Latency_ijk = γ₀₀₀ + β₁(Churn) + β₂(Workload) + β₃(Experience) + v₀₀k + u₀jk + e_ijk
        </div>
        <div className="text-slate-400 text-[11px]">
          R² = {coeff.r_squared.toFixed(2)} | F-statistic p &lt; 0.0001
        </div>
      </div>
    </div>
  );
};

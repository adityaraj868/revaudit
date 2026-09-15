import React from 'react';
import { HypothesisResult } from '../types';
import { CheckCircle2, ShieldCheck, Scale, Cpu, Activity, ArrowRight } from 'lucide-react';

interface HypothesesValidationMatrixProps {
  hypotheses: HypothesisResult[];
}

export const HypothesesValidationMatrix: React.FC<HypothesesValidationMatrixProps> = ({
  hypotheses
}) => {
  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-bold text-white">Scientific Hypotheses Validation Matrix</h3>
          <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-mono">
            Empirical Results
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Formal statistical validation of hypotheses H1, H2, and H3 modeling reviewer workload saturation, cross-repository governance variance, and blame-free anomaly detection.
        </p>
      </div>

      {/* 3 Hypotheses Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {hypotheses.map((h, idx) => {
          let icon = <Activity className="h-5 w-5 text-teal-400" />;
          if (h.id === 'H2') icon = <Cpu className="h-5 w-5 text-indigo-400" />;
          if (h.id === 'H3') icon = <ShieldCheck className="h-5 w-5 text-emerald-400" />;

          return (
            <div
              key={h.id}
              className="p-5 bg-slate-850 border border-slate-700/80 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-600 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-slate-800 rounded-xl">{icon}</div>
                    <span className="font-extrabold text-sm text-white font-mono">{h.title}</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center space-x-1 font-mono">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>CONFIRMED</span>
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {h.hypothesis}
                </p>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Effect Size:</span>
                    <span className="font-bold text-teal-300">{h.effect_size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Test Statistic:</span>
                    <span className="text-slate-200">{h.test_statistic}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Significance:</span>
                    <span className="text-emerald-400 font-bold">{h.p_value}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">95% Conf. Interval:</span>
                    <span className="text-slate-200">{h.ci_95}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 italic">
                "{h.interpretation}"
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { X, ShieldCheck, CheckCircle2, Lock, Scale, BarChart3 } from 'lucide-react';

interface EthicalSafeguardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EthicalSafeguardsModal: React.FC<EthicalSafeguardsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Ethical &amp; Privacy Safeguard Specification</h3>
              <p className="text-xs text-slate-400">UCS503 Software Engineering Lab Mandatory Guardrails</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm text-slate-300 max-h-[75vh] overflow-y-auto">
          <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl">
            <p className="text-xs text-teal-200 leading-relaxed">
              <strong>Core Scientific Principle:</strong> Code review turnaround delay is a property of repository governance, patch complexity, and reviewer workload saturation—not individual developer deficiency. RevAudit models systems and processes, completely eliminating toxic developer surveillance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-850 border border-slate-700/80 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs font-mono uppercase">
                <Lock className="h-4 w-4" />
                <span>1. Zero Developer Ranking</span>
              </div>
              <p className="text-xs text-slate-400">
                The platform contains no fastest/slowest reviewer leaderboards, speed scorecards, or competitive individual comparison tables.
              </p>
            </div>

            <div className="p-4 bg-slate-850 border border-slate-700/80 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs font-mono uppercase">
                <Scale className="h-4 w-4" />
                <span>2. Zero Bias Labeling</span>
              </div>
              <p className="text-xs text-slate-400">
                The audit engine never classifies human actors as &quot;biased,&quot; &quot;lazy,&quot; or &quot;discriminatory.&quot; Statistical residuals are labeled strictly as workflow anomalies.
              </p>
            </div>

            <div className="p-4 bg-slate-850 border border-slate-700/80 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-teal-400 font-semibold text-xs font-mono uppercase">
                <BarChart3 className="h-4 w-4" />
                <span>3. Mandatory Uncertainty</span>
              </div>
              <p className="text-xs text-slate-400">
                Every metric, expected estimate, and anomaly score displayed features an empirical standard error and 95% Confidence Interval ([μ ± 1.96·SE]).
              </p>
            </div>

            <div className="p-4 bg-slate-850 border border-slate-700/80 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs font-mono uppercase">
                <CheckCircle2 className="h-4 w-4" />
                <span>4. Process Investigation Flags</span>
              </div>
              <p className="text-xs text-slate-400">
                Flags isolate systemic workload bottlenecks (e.g. concurrent PR queue &gt; 5), prompting organizational capacity audits rather than punitive actions.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-300">Target Scientific Context:</p>
            <p>
              Developed for Empirical Software Engineering research and maintainers of major open-source ecosystems (React, Vue, Node, Django, NumPy, Go, Rust, Next.js).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-850 px-6 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg transition-colors font-mono"
          >
            Acknowledge &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};

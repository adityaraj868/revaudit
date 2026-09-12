import React, { useState } from 'react';
import { ShieldCheck, HelpCircle, X, Lock, Scale, BarChart3, CheckCircle2 } from 'lucide-react';

export const EthicalBanner: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <>
      {/* Top Banner */}
      <div className="bg-slate-900 border-y border-teal-500/30 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-teal-500/20 rounded-md">
              <ShieldCheck className="h-4 w-4 text-teal-400" />
            </div>
            <div>
              <span className="font-semibold text-teal-300 mr-1.5 font-mono">
                [ETHICAL SAFEGUARD AUDIT ACTIVE]
              </span>
              <span>
                RevAudit models aggregate engineering process consistency. Individual developer rankings and bias labeling are strictly prohibited.
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-1 text-teal-400 hover:text-teal-300 font-medium underline underline-offset-2 whitespace-nowrap"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Ethical Safeguards &amp; Uncertainty Policy</span>
          </button>
        </div>
      </div>

      {/* Popover Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-850 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Blame-Free Ethical Safeguards</h3>
                  <p className="text-xs text-slate-400">UCS503 Software Engineering Lab Mandatory Standards</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-sm text-slate-300 max-h-[75vh] overflow-y-auto">
              <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                <p className="text-xs text-teal-200 leading-relaxed">
                  <strong>Core Thesis:</strong> Code review turnaround variations stem from concurrent workload saturation, patch churn, and repository-level gatekeeping rules—not individual human deficiency. RevAudit models processes rather than people.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs font-mono uppercase">
                    <Lock className="h-4 w-4" />
                    <span>1. Zero Developer Ranking</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    The platform never creates fastest/slowest developer leaderboards or productivity scorecards.
                  </p>
                </div>

                <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs font-mono uppercase">
                    <Scale className="h-4 w-4" />
                    <span>2. Zero Bias Labeling</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    The system never classifies any human reviewer as &quot;biased&quot; or &quot;unfair.&quot; Residuals are labeled strictly as workflow anomalies.
                  </p>
                </div>

                <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-teal-400 font-semibold text-xs font-mono uppercase">
                    <BarChart3 className="h-4 w-4" />
                    <span>3. Mandatory Uncertainty</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    All metrics and anomaly predictions display empirical 95% Confidence Intervals ([μ ± 1.96·SE]).
                  </p>
                </div>

                <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs font-mono uppercase">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>4. Process Investigation</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Flags isolate systemic workload bottlenecks (e.g. concurrent PR queue &gt; 5) prompting capacity reviews instead of punitive actions.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-850 px-6 py-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg transition-colors font-mono"
              >
                Acknowledge Safeguards
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

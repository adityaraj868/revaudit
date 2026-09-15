import React from 'react';
import { ShieldCheck, HelpCircle, Info } from 'lucide-react';

interface EthicalSafeguardsBannerProps {
  onOpenModal: () => void;
}

export const EthicalSafeguardsBanner: React.FC<EthicalSafeguardsBannerProps> = ({ onOpenModal }) => {
  return (
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
              RevAudit performs process-level variance audits. Zero developer scorecards, zero individual blame, and mandatory 95% Confidence Intervals are enforced.
            </span>
          </div>
        </div>
        <button
          onClick={onOpenModal}
          className="inline-flex items-center space-x-1 text-teal-400 hover:text-teal-300 font-medium underline underline-offset-2 whitespace-nowrap"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Learn about blame-free SE auditing</span>
        </button>
      </div>
    </div>
  );
};

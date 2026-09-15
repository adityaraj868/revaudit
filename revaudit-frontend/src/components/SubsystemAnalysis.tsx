import React from 'react';
import { SubsystemBreakdown } from '../types';
import { Layers, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface SubsystemAnalysisProps {
  subsystems: SubsystemBreakdown[];
}

export const SubsystemAnalysis: React.FC<SubsystemAnalysisProps> = ({ subsystems }) => {
  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
      <div>
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-bold text-white">Subsystem Latency Breakdown</h3>
          <span className="px-2 py-0.5 text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded-md font-mono">
            Confounder Control
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Review turnaround variations decomposed across functional domains (core runtime vs API vs docs vs tests vs UI).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
        {subsystems.map(s => {
          const isHigh = s.modifier > 1.0;
          return (
            <div key={s.subsystem} className="p-4 bg-slate-850 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-white text-sm uppercase">{s.subsystem}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  isHigh ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                }`}>
                  {isHigh ? `+${((s.modifier - 1)*100).toFixed(0)}%` : `${((s.modifier - 1)*100).toFixed(0)}%`}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-slate-400">Mean Turnaround:</p>
                <p className="font-bold text-white font-mono text-base">{s.mean_latency_hrs.toFixed(1)} hrs</p>
                <p className="text-slate-400 text-[10px] font-mono">Sample: {s.count} PRs</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

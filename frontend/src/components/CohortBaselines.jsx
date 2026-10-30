import React from 'react';
import { Layers } from 'lucide-react';

export default function CohortBaselines({ baselineMedians = {} }) {
  const cohorts = [
    {
      key: 'Small',
      name: 'Small PRs',
      desc: 'Up to 100 changed lines and 5 files',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    },
    {
      key: 'Medium',
      name: 'Medium PRs',
      desc: 'Up to 1,000 changed lines and 20 files',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    },
    {
      key: 'Large',
      name: 'Large PRs',
      desc: 'Above either medium cutoff',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    },
    { key: 'Unknown', name: 'Unknown scope', desc: 'Code change metadata unavailable' }
  ];

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span>Size-Controlled Review Baselines</span>
        </h3>
        <span className="text-xs text-slate-400">
          Time to first human review; Kaplan–Meier median with bootstrap 95% interval
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {cohorts.map((cohort) => {
          const data = baselineMedians?.[cohort.key];
          const hasData = Boolean(data && data.sample_size > 0);
          const medianHours = hasData ? data.median_hours : null;
          const ci = data?.confidence_interval_95;

          return (
            <div 
              key={cohort.key} 
              className="p-3.5 rounded-lg border border-slate-800 bg-slate-900 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  {cohort.name}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {hasData ? `n = ${data.sample_size}` : 'n = 0'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-snug">
                {cohort.desc}
              </p>

              {hasData ? (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Cohort Median:</span>
                    <span className="text-base font-bold font-mono text-white tabular-nums">
                      {medianHours == null ? 'Median not reached' : `${medianHours.toFixed(2)}h`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>95% CI:</span>
                    <span className="font-mono text-slate-300 tabular-nums">
                      {ci ? `[${ci[0].toFixed(2)}h – ${ci[1].toFixed(2)}h]` : 'Unavailable'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">{data.event_count} reviewed · {data.censored_count} censored</div>
                </div>
              ) : (
                <div className="py-2 text-center text-xs text-slate-400 border border-dashed border-slate-800/80 rounded">
                  No usable timeline records in this cohort
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

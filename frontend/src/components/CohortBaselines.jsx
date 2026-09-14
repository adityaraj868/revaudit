import React from 'react';
import { Layers } from 'lucide-react';

export default function CohortBaselines({ baselineMedians = {} }) {
  const cohorts = [
    {
      key: 'Small',
      name: 'Small PRs',
      desc: '< 250 characters (minor fixes, docs, typos)',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    },
    {
      key: 'Medium',
      name: 'Medium PRs',
      desc: '250 – 1000 characters (standard feature work)',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    },
    {
      key: 'Large',
      name: 'Large PRs',
      desc: '> 1000 characters (architectural refactors)',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    }
  ];

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span>Size-Controlled Review Baselines</span>
        </h3>
        <span className="text-xs text-slate-400">
          Cohort medians with 90% confidence intervals (CI₉₀)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cohorts.map((cohort) => {
          const data = baselineMedians?.[cohort.key];
          const hasData = Boolean(data && data.sample_size > 0);
          const medianHours = hasData ? data.median_hours : 0;
          const ciLower = hasData && data.mock_ci_90 ? data.mock_ci_90[0] : 0;
          const ciUpper = hasData && data.mock_ci_90 ? data.mock_ci_90[1] : 0;
          const threshold = (medianHours * 1.5).toFixed(2);

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
                      {medianHours.toFixed(2)}h
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>90% CI:</span>
                    <span className="font-mono text-slate-300 tabular-nums">
                      [{ciLower.toFixed(2)}h – {ciUpper.toFixed(2)}h]
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Anomaly Threshold:</span>
                    <span className="font-mono text-amber-400 font-medium tabular-nums">
                      &gt; {threshold}h
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-center text-xs text-slate-400 border border-dashed border-slate-800/80 rounded">
                  No merged PRs in this cohort
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';

export default function MetricCard({ 
  label, 
  value, 
  unit = '', 
  subtext = '', 
  status = 'neutral',
  icon: Icon = null
}) {
  const valueColor = {
    neutral: 'text-white',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-rose-400',
    info: 'text-blue-400'
  }[status] || 'text-white';

  return (
    <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900 flex flex-col justify-between space-y-1.5 font-sans">
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
        <span>{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
      </div>

      <div className="flex items-baseline space-x-1.5">
        <span className={`text-xl font-bold tracking-tight font-mono tabular-nums ${valueColor}`}>
          {value}
        </span>
        {unit && <span className="text-xs text-slate-400 font-mono">{unit}</span>}
      </div>

      {subtext && (
        <div className="text-[11px] text-slate-400 truncate">
          {subtext}
        </div>
      )}
    </div>
  );
}

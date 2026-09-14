import React from 'react';

export default function PageHeader({ 
  title, 
  subtitle, 
  badges = [], 
  actions = null 
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 font-sans">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
            {title}
          </h1>
          {badges.map((b, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded text-[11px] font-sans font-normal border ${
                b.color || 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {b.label}
            </span>
          ))}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center space-x-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

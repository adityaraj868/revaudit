import React from 'react';
import { 
  Activity, 
  BarChart3, 
  AlertCircle, 
  Layers, 
  Presentation, 
  ShieldCheck, 
  GitPullRequest, 
  ExternalLink
} from 'lucide-react';
import iconSvgSrc from '../../../design/icon.svg';

export default function Sidebar({ activeTab, onNavigate, anomaliesCount = 0, currentRepo = '' }) {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Activity,
      badge: null
    },
    {
      id: 'analysis',
      label: 'Review Analysis',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'patterns',
      label: 'Detected Patterns',
      icon: AlertCircle,
      badge: anomaliesCount > 0 ? `${anomaliesCount}` : null
    },
    {
      id: 'methodology',
      label: 'Methodology & UML',
      icon: Layers,
      badge: null
    },
    {
      id: 'presentation',
      label: 'Presentation',
      icon: Presentation,
      badge: null
    },
    {
      id: 'ethics',
      label: 'Ethical Safeguards',
      icon: ShieldCheck,
      badge: null
    }
  ];

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 select-none z-30 font-sans">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 space-y-2.5">
        <div 
          onClick={() => onNavigate('overview')}
          className="cursor-pointer space-y-0.5 group"
        >
          <div className="flex items-center space-x-2">
            <img 
              src={iconSvgSrc || "/design/icon.svg"} 
              alt="RevAudit Logo" 
              className="w-5 h-5 invert opacity-60 object-contain"
              onError={(e) => { e.target.src = '/icon.svg'; }}
            />
            <span className="font-semibold text-base tracking-tight text-white group-hover:text-orange-400 transition-colors">
              RevAudit
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Statistical Review Audit
          </p>
        </div>

        <button
          onClick={() => onNavigate('home')}
          className="w-full text-left px-2.5 py-1.5 rounded bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          <span>← Product Website</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-white font-medium shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Details */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50 space-y-2 text-xs">
        <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5 font-sans">
            Target Repository
          </div>
          <div className="text-slate-200 font-mono text-xs truncate">
            {currentRepo || 'fastapi/fastapi'}
          </div>
        </div>

        <div className="flex items-center justify-between text-slate-400 text-[11px] px-0.5">
          <span>UCS503 Lab</span>
          <a
            href="https://github.com/adityaraj868/revaudit"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1"
            title="Open GitHub Repository"
          >
            <GitPullRequest className="w-3 h-3" />
            <span>Repo</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </aside>
  );
}

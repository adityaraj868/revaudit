import React, { useState } from 'react';
import { 
  Activity, 
  BarChart3, 
  AlertCircle, 
  Layers, 
  Presentation, 
  ShieldCheck, 
  GitPullRequest, 
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import iconSvgSrc from '../../../design/icon.svg';

export default function Sidebar({ activeTab, onNavigate, anomaliesCount = 0, currentRepo = '' }) {
  const [collapsed, setCollapsed] = useState(false);

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
    <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 select-none z-30 font-sans transition-all duration-200 shrink-0`}>
      {/* Brand Header */}
      <div className={`border-b border-slate-800 ${collapsed ? 'p-3 flex flex-col items-center space-y-3' : 'p-4 space-y-2.5'}`}>
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between">
              <div 
                onClick={() => onNavigate('home')}
                className="cursor-pointer space-y-0.5 group flex-1"
                title="Return to RevAudit Homepage"
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

              {/* Collapse Toggle Button */}
              <button
                onClick={() => setCollapsed(true)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => onNavigate('home')}
              className="w-full text-left px-2.5 py-1.5 rounded bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <span>← Product Website</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <button
              onClick={() => onNavigate('home')}
              className="cursor-pointer group p-1"
              title="Return to RevAudit Homepage"
            >
              <img 
                src={iconSvgSrc || "/design/icon.svg"} 
                alt="RevAudit Logo" 
                className="w-5 h-5 invert opacity-60 group-hover:opacity-100 object-contain transition-opacity"
                onError={(e) => { e.target.src = '/icon.svg'; }}
              />
            </button>
            <button
              onClick={() => setCollapsed(false)}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className={`flex-1 ${collapsed ? 'px-2 py-3 space-y-1.5' : 'px-2.5 py-3 space-y-0.5'} overflow-y-auto`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2'} rounded-md text-xs transition-colors cursor-pointer relative ${
                isActive
                  ? 'bg-slate-800 text-white font-medium shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                  {item.badge}
                </span>
              )}

              {collapsed && item.badge && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Details */}
      {!collapsed ? (
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
      ) : (
        <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex flex-col items-center space-y-2 text-xs">
          <a
            href="https://github.com/adityaraj868/revaudit"
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={`GitHub Repository: ${currentRepo || 'fastapi/fastapi'}`}
          >
            <GitPullRequest className="w-4 h-4" />
          </a>
        </div>
      )}
    </aside>
  );
}

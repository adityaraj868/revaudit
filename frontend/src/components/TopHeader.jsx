import React, { useState } from 'react';
import { 
  Search, 
  RefreshCw, 
  Menu, 
  X, 
  GitPullRequest, 
  Presentation, 
  ChevronRight, 
  SlidersHorizontal
} from 'lucide-react';
import { SAMPLE_REPOSITORIES } from '../data/sampleAudits';
import iconSvgSrc from '../../../design/icon.svg';

export default function TopHeader({ 
  activeTab, 
  onNavigate, 
  repoInput, 
  setRepoInput, 
  onRunAudit, 
  loading,
  currentRepo,
  mobileOpen,
  setMobileOpen
}) {
  const [showQuickPicker, setShowQuickPicker] = useState(false);

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Overview';
      case 'analysis': return 'Review Analysis';
      case 'patterns': return 'Detected Patterns';
      case 'methodology': return 'Methodology & UML';
      case 'presentation': return 'Presentation';
      case 'ethics': return 'Ethical Safeguards';
      default: return 'Overview';
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 font-sans">
      <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <button 
              onClick={() => onNavigate('home')} 
              className="hover:text-slate-200 transition-colors font-semibold text-white cursor-pointer flex items-center space-x-1.5"
            >
              <img 
                src={iconSvgSrc || "/design/icon.svg"} 
                alt="RevAudit Logo" 
                className="w-4 h-4 invert opacity-60 object-contain"
                onError={(e) => { e.target.src = '/icon.svg'; }}
              />
              <span>RevAudit</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-200 font-medium">{getBreadcrumbTitle()}</span>
            {currentRepo && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
                <span className="text-slate-300 font-mono text-[11px] hidden sm:inline">
                  {currentRepo}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Search & Actions */}
        <div className="flex items-center space-x-2">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              onRunAudit();
            }}
            className="hidden sm:flex items-center space-x-1.5"
          >
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="owner/repo (e.g. fastapi/fastapi)"
                className="w-52 bg-slate-950 border border-slate-800 focus:border-slate-600 text-slate-200 pl-8 pr-3 py-1.5 rounded-md text-xs font-mono focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-xs rounded-md transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Auditing...</span>
                </>
              ) : (
                <span>Audit</span>
              )}
            </button>
          </form>

          {/* Quick Repos Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowQuickPicker(!showQuickPicker)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-md text-xs transition-colors flex items-center space-x-1.5"
              title="Select Sample Repository"
            >
              <SlidersHorizontal className="w-3 h-3 text-slate-400" />
              <span className="hidden md:inline">Quick Repos</span>
            </button>

            {showQuickPicker && (
              <div 
                className="absolute right-0 mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1.5 z-50 space-y-0.5 text-xs animate-fade-in"
                onMouseLeave={() => setShowQuickPicker(false)}
              >
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  Sample Repositories
                </div>
                {SAMPLE_REPOSITORIES.map((repo) => (
                  <button
                    key={repo.slug}
                    onClick={() => {
                      setRepoInput(repo.slug);
                      onRunAudit(repo.slug);
                      setShowQuickPicker(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between font-mono ${
                      currentRepo === repo.slug
                        ? 'bg-slate-800 text-white font-medium'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{repo.slug}</span>
                    {currentRepo === repo.slug && (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mode Switch Button */}
          {activeTab !== 'presentation' ? (
            <button
              onClick={() => onNavigate('presentation')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-md text-xs transition-colors flex items-center space-x-1.5"
            >
              <Presentation className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">Presentation</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('overview')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-md text-xs transition-colors flex items-center space-x-1.5"
            >
              <GitPullRequest className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">Back to Overview</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Input Row */}
      <div className="p-3 border-t border-slate-800 sm:hidden bg-slate-950/60">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            onRunAudit();
          }}
          className="flex items-center space-x-2"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="owner/repo"
              className="w-full bg-slate-950 border border-slate-800 focus:border-slate-600 text-slate-200 pl-8 pr-3 py-1.5 rounded-md text-xs font-mono focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-800 text-slate-950 font-semibold text-xs rounded-md"
          >
            Audit
          </button>
        </form>
      </div>
    </header>
  );
}

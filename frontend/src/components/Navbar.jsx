import React, { useState } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  FileText, 
  Menu, 
  X, 
  ExternalLink,
  GitPullRequest
} from 'lucide-react';

export default function Navbar({ activeTab, onNavigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tabId) => {
    onNavigate(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div 
            onClick={() => handleNavClick('project')}
            className="flex items-center space-x-3 cursor-pointer group select-none"
          >
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-xs group-hover:bg-indigo-700 transition-colors">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  RevAudit
                </span>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200/70">
                  Team ArchCoders
                </span>
              </div>
              <p className="text-2xs text-slate-500 hidden sm:block">GitHub PR Review Effort Anomaly Engine</p>
            </div>
          </div>

          {/* Desktop Primary Navigation */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => handleNavClick('project')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'project' || activeTab === 'demo'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${activeTab === 'project' ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span>RevAudit Project</span>
            </button>

            <button
              onClick={() => handleNavClick('presentation')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'presentation'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileText className={`w-4 h-4 ${activeTab === 'presentation' ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span>Presentation Deck</span>
            </button>
          </nav>

          {/* Right Action / GitHub Link (Desktop) */}
          <div className="hidden lg:flex items-center space-x-3">
            <a
              href="https://github.com/adityaraj868/revaudit/tree/sparsh-1704"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-colors border border-slate-200"
            >
              <GitPullRequest className="w-3.5 h-3.5 text-indigo-600" />
              <span>GitHub Repo</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-1.5 shadow-lg animate-fade-in">
          <button
            onClick={() => handleNavClick('project')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'project' || activeTab === 'demo'
                ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <div className="text-left">
                <div className="text-sm">RevAudit Project</div>
                <div className="text-2xs text-slate-400">Live PR review effort audit tool</div>
              </div>
            </div>
            {(activeTab === 'project' || activeTab === 'demo') && (
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            )}
          </button>

          <button
            onClick={() => handleNavClick('presentation')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'presentation'
                ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-indigo-600" />
              <div className="text-left">
                <div className="text-sm">Presentation Deck</div>
                <div className="text-2xs text-slate-400">Academic evaluation slides &amp; UML</div>
              </div>
            </div>
            {activeTab === 'presentation' && (
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            )}
          </button>
        </div>
      )}
    </header>
  );
}

import React from 'react';
import { ShieldCheck, Database, GitPullRequest, Activity, BookOpen, Layers, Terminal } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenEthicalModal: () => void;
  selectedRepo: string;
  setSelectedRepo: (repo: string) => void;
  repositories: string[];
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenEthicalModal,
  selectedRepo,
  setSelectedRepo,
  repositories
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Activity className="h-6 w-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white font-mono">
                  Rev<span className="text-teal-400">Audit</span>
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded-full font-mono">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Statistical Audit of Code-Review Consistency & Workload
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'overview'
                  ? 'bg-slate-800 text-teal-400 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Executive Overview
            </button>
            <button
              onClick={() => setActiveTab('turnaround')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'turnaround'
                  ? 'bg-slate-800 text-teal-400 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Turnaround Variance
            </button>
            <button
              onClick={() => setActiveTab('hypotheses')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'hypotheses'
                  ? 'bg-slate-800 text-teal-400 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Hypotheses & Models
            </button>
            <button
              onClick={() => setActiveTab('explorer')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'explorer'
                  ? 'bg-slate-800 text-teal-400 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              PR Explorer
            </button>
            <button
              onClick={() => setActiveTab('shift_benchmark')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'shift_benchmark'
                  ? 'bg-slate-800 text-teal-400 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Shift Benchmark
            </button>
          </nav>

          {/* Right Actions: Repo Filter & Ethical Safeguards Button */}
          <div className="flex items-center space-x-3">
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="bg-slate-800/90 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
            >
              <option value="ALL">All 15 Repositories</option>
              {repositories.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <button
              onClick={onOpenEthicalModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm"
              title="View Blame-Free Ethical Safeguards"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="hidden lg:inline">Ethical Safeguards</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

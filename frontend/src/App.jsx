import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import PageHeader from './components/PageHeader';
import MetricCard from './components/MetricCard';
import CohortBaselines from './components/CohortBaselines';
import AnomalyTable from './components/AnomalyTable';
import { CohortLatencyChart, TurnaroundScatterChart } from './components/StatisticalCharts';
import MethodologyView from './components/MethodologyView';
import PresentationDeck from './components/PresentationDeck';
import EthicalSafeguardsView from './components/EthicalSafeguardsView';
import ReviewAnalysisView from './components/ReviewAnalysisView';
import DetectedPatternsView from './components/DetectedPatternsView';
import LandingPage from './components/LandingPage';
import ContributorDashboard from './components/ContributorDashboard';
import { ErrorState } from './components/States';
import { FALLBACK_AUDIT_DATA } from './data/sampleAudits';
import { apiUrl } from './lib/api';
import { 
  GitPullRequest, 
  AlertTriangle, 
  CheckCircle2, 
  Scale, 
  RefreshCw,
  FileDown,
  Users,
  ExternalLink
} from 'lucide-react';

export default function App() {
  // Sync tab state with URL hash
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (['overview', 'contributor', 'analysis', 'patterns', 'methodology', 'presentation', 'ethics'].includes(hash)) {
        return hash;
      }
      if (hash === 'audit' || hash === 'app' || hash === 'dashboard') return 'overview';
      if (hash === 'deck' || hash === 'slides') return 'presentation';
      if (hash === 'home' || hash === 'landing') return 'home';
    }
    return 'home';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [repoInput, setRepoInput] = useState('fastapi/fastapi');
  const [currentRepo, setCurrentRepo] = useState('fastapi/fastapi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditData, setAuditData] = useState(FALLBACK_AUDIT_DATA['fastapi/fastapi']);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Tab navigation handler
  const handleNavigate = (tab) => {
    setActiveTab(tab);
    setMobileOpen(false);
    if (typeof window !== 'undefined') {
      if (tab === 'home') {
        window.location.hash = '';
      } else {
        window.location.hash = tab;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Browser back/forward navigation sync
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (['overview', 'contributor', 'analysis', 'patterns', 'methodology', 'presentation', 'ethics'].includes(hash)) {
        setActiveTab(hash);
      } else if (hash === 'presentation' || hash === 'deck' || hash === 'slides') {
        setActiveTab('presentation');
      } else if (hash === 'audit' || hash === 'dashboard') {
        setActiveTab('overview');
      } else {
        setActiveTab('home');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Parse repo from string or URL
  const parseRepo = (input) => {
    const cleaned = input.trim()
      .replace(/^https?:\/\/github\.com\//, '')
      .replace(/^git@github\.com:/, '')
      .replace(/\.git$/, '')
      .replace(/\/$/, '');
    const parts = cleaned.split('/');
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1], slug: `${parts[0]}/${parts[1]}` };
    }
    return null;
  };

  // Run live repository audit
  const handleRunAudit = async (target = repoInput) => {
    const parsed = parseRepo(target);
    if (!parsed) {
      setError("Please enter a valid repository format like 'owner/repo' (e.g. 'fastapi/fastapi') or a GitHub URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentRepo(parsed.slug);

    try {
      const liveUrl = apiUrl(`/api/audit?owner=${encodeURIComponent(parsed.owner)}&repo=${encodeURIComponent(parsed.repo)}`);
      let response = await fetch(liveUrl, {
        method: 'GET',
        credentials: 'include',
      }).catch(() => null);

      if (response?.ok) {
        setAuditData(await response.json());
      } else if (FALLBACK_AUDIT_DATA[parsed.slug]) {
        setAuditData(FALLBACK_AUDIT_DATA[parsed.slug]);
      } else {
        const errBody = await response?.json().catch(() => ({}));
        throw new Error(errBody?.detail || `Unable to load audit data${response ? ` (status ${response.status})` : ''}.`);
      }
    } catch (err) {
      if (FALLBACK_AUDIT_DATA[parsed.slug]) {
        setAuditData(FALLBACK_AUDIT_DATA[parsed.slug]);
      } else {
        setError(err.message || 'Failed to connect to the RevAudit backend. Check repository coordinates or rate limits.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!auditData || exporting) return;
    setExporting(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/reports/pdf'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          owner: parsedActiveRepo.owner,
          repo: parsedActiveRepo.repo,
          ...auditData,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `PDF export failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `RevAudit_${parsedActiveRepo.owner}_${parsedActiveRepo.repo}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (exportError) {
      setError(exportError.message || 'Unable to export the audit PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleLogin = () => {
    window.location.assign(apiUrl('/auth/github/login'));
  };

  const handleLogout = async () => {
    await fetch(apiUrl('/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null);
    setAuthUser(null);
  };

  useEffect(() => {
    fetch(apiUrl('/api/auth/me'), { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (payload?.authenticated) setAuthUser(payload.user);
      })
      .catch(() => null);

  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;
    const init = async () => {
      if (!ignore) {
        await handleRunAudit('fastapi/fastapi');
      }
    };
    init();
    return () => { ignore = true; };
  }, []);

  const parsedActiveRepo = parseRepo(currentRepo) || { owner: 'fastapi', repo: 'fastapi' };
  const anomaliesCount = auditData?.anomalies_count || auditData?.anomalies?.length || 0;
  const mergedCount = auditData?.merged_prs_count || 0;
  const totalClosed = auditData?.total_closed_prs || 0;
  const droppedCount = auditData?.unmerged_prs_dropped || 0;
  const baselineMedians = auditData?.baseline_medians || {};
  const anomalies = auditData?.anomalies || [];
  const workloadSummary = auditData?.workload_summary || {};
  const authError = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('auth_error')
    : null;
  const displayError = error || (authError ? `GitHub sign-in failed: ${authError}` : null);

  // Review health calculation
  const reviewHealthPct = mergedCount > 0 
    ? Math.round(((mergedCount - anomaliesCount) / mergedCount) * 100) 
    : 100;

  // =========================================================================
  // 1. PRODUCT LANDING PAGE VIEW
  // =========================================================================
  if (activeTab === 'home' || activeTab === 'landing') {
    return (
      <LandingPage
        onOpenAudit={() => handleNavigate('overview')}
        onNavigateToMethodology={() => handleNavigate('methodology')}
        onNavigateToPresentation={() => handleNavigate('presentation')}
        currentRepo={currentRepo}
      />
    );
  }

  // =========================================================================
  // 2. ANALYTICAL APPLICATION WORKSPACE (WITH SIDEBAR & TOPHEADER)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-orange-500/30 selection:text-orange-200">
      
      {/* Desktop Left Navigation Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          activeTab={activeTab}
          onNavigate={handleNavigate}
          anomaliesCount={anomaliesCount}
          currentRepo={currentRepo}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-950/80 backdrop-blur-sm animate-fade-in flex">
          <div className="w-64 h-full">
            <Sidebar
              activeTab={activeTab}
              onNavigate={handleNavigate}
              anomaliesCount={anomaliesCount}
              currentRepo={currentRepo}
            />
          </div>
          <div className="flex-1" onClick={() => setMobileOpen(false)}></div>
        </div>
      )}

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <TopHeader
          activeTab={activeTab}
          onNavigate={handleNavigate}
          repoInput={repoInput}
          setRepoInput={setRepoInput}
          onRunAudit={() => handleRunAudit(repoInput)}
          loading={loading}
          currentRepo={currentRepo}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          authUser={authUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />

        {/* Dynamic Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {/* ========================================================================= */}
          {/* OVERVIEW & LIVE AUDIT DASHBOARD                                           */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Page Title & Repo Metadata */}
              <PageHeader
                title={`Reviewer Dashboard: ${currentRepo}`}
                subtitle="Repository-wide review effort, turnaround consistency, and size-controlled anomaly analysis."
                badges={[
                  { label: 'GitHub REST API v3', color: 'bg-slate-800 text-slate-300 border-slate-700' },
                  { label: 'Non-Parametric Medians', color: 'bg-slate-800 text-slate-300 border-slate-700' },
                  { label: 'Survival Bias Filtered', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
                ]}
                actions={
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRunAudit(currentRepo)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>Refresh Audit</span>
                    </button>
                    <button
                      onClick={handleExportPdf}
                      disabled={exporting || loading}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-slate-950 border border-orange-400 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>{exporting ? 'Exporting...' : 'PDF Report'}</span>
                    </button>
                  </div>
                }
              />

              {/* Error Message */}
              {displayError && (
                <ErrorState error={displayError} onRetry={() => handleRunAudit(currentRepo)} />
              )}

              {/* Keep the dashboard visible while a live refresh is in progress. */}
              {loading && (
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs text-slate-400" aria-live="polite">
                  Refreshing audit data for <span className="font-mono text-slate-200">{currentRepo}</span>… Existing results remain visible.
                </div>
              )}

              {/* Main Analytical Dashboard Content */}
              {auditData && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* High Density Metric Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <MetricCard
                      label="Evaluated Merged PRs"
                      value={mergedCount}
                      unit={`/ ${totalClosed} closed`}
                      subtext={`${droppedCount} unmerged branches discarded`}
                      status="neutral"
                      icon={GitPullRequest}
                      footnote="Survival filter"
                    />

                    <MetricCard
                      label="Flagged Anomalies"
                      value={anomaliesCount}
                      unit={`PR${anomaliesCount === 1 ? '' : 's'}`}
                      subtext={anomaliesCount > 0 ? 'Exceeded > 1.5x group median' : 'Within normal baselines'}
                      status={anomaliesCount > 0 ? 'warning' : 'success'}
                      icon={AlertTriangle}
                      footnote="> 1.5x median"
                    />

                    <MetricCard
                      label="Review Consistency"
                      value={`${reviewHealthPct}%`}
                      subtext="Conforming to size baseline"
                      status={reviewHealthPct >= 80 ? 'success' : 'warning'}
                      icon={CheckCircle2}
                      footnote="Process bounds"
                    />

                    <MetricCard
                      label="Audit Target"
                      value={parsedActiveRepo.repo}
                      unit={`@${parsedActiveRepo.owner}`}
                      subtext="Live open-source repository"
                      status="info"
                      icon={Scale}
                      footnote="v3 REST"
                    />

                    <MetricCard
                      label="Reviewer Queue"
                      value={Number(workloadSummary.average_concurrent_prs || 0).toFixed(1)}
                      unit="active PRs"
                      subtext={`${workloadSummary.review_event_count || 0} review events synced`}
                      status="info"
                      icon={Users}
                      footnote="First-review snapshot"
                    />
                  </div>

                  {/* Size-Controlled Review Baselines Breakdown */}
                  <CohortBaselines baselineMedians={baselineMedians} />

                  {/* Interactive Statistical Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <CohortLatencyChart
                      baselineMedians={baselineMedians}
                      anomalies={anomalies}
                    />
                    <TurnaroundScatterChart
                      anomalies={anomalies}
                      baselineMedians={baselineMedians}
                    />
                  </div>

                  {/* Flagged Review Anomalies Table */}
                  <AnomalyTable
                    anomalies={anomalies}
                    repoOwner={parsedActiveRepo.owner}
                    repoName={parsedActiveRepo.repo}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'contributor' && (
            <div className="animate-fade-in">
              <ContributorDashboard
                auditData={auditData}
                currentRepo={currentRepo}
                loading={loading}
                error={error}
                onRefresh={() => handleRunAudit(currentRepo)}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* REVIEW EFFORT ANALYSIS VIEW                                               */}
          {/* ========================================================================= */}
          {activeTab === 'analysis' && (
            <div className="animate-fade-in">
              <ReviewAnalysisView
                auditData={auditData}
                currentRepo={currentRepo}
                repoOwner={parsedActiveRepo.owner}
                repoName={parsedActiveRepo.repo}
                loading={loading}
                error={error}
                onRefresh={() => handleRunAudit(currentRepo)}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* DETECTED ANOMALY PATTERNS VIEW                                            */}
          {/* ========================================================================= */}
          {activeTab === 'patterns' && (
            <div className="animate-fade-in">
              <DetectedPatternsView
                auditData={auditData}
                currentRepo={currentRepo}
                repoOwner={parsedActiveRepo.owner}
                repoName={parsedActiveRepo.repo}
                loading={loading}
                error={error}
                onRefresh={() => handleRunAudit(currentRepo)}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* METHODOLOGY & UML ARCHITECTURE VIEW                                       */}
          {/* ========================================================================= */}
          {activeTab === 'methodology' && (
            <div className="animate-fade-in">
              <MethodologyView />
            </div>
          )}

          {/* ========================================================================= */}
          {/* ACADEMIC PRESENTATION DECK VIEW                                           */}
          {/* ========================================================================= */}
          {activeTab === 'presentation' && (
            <div className="animate-fade-in">
              <PresentationDeck
                onNavigateToAudit={() => handleNavigate('overview')}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETHICAL SAFEGUARDS & BOUNDARIES VIEW                                      */}
          {/* ========================================================================= */}
          {activeTab === 'ethics' && (
            <div className="animate-fade-in">
              <EthicalSafeguardsView />
            </div>
          )}

        </main>

        {/* Global Engineered Footer */}
        <footer className="border-t border-slate-900 bg-slate-950 px-4 sm:px-6 lg:px-8 py-4 text-[11px] font-mono text-slate-500 select-none">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-400">RevAudit</span>
              <span>•</span>
              <span>Statistical Audit of Code-Review Consistency and Workload</span>
            </div>

            <div className="flex items-center space-x-3 text-slate-400">
              <span>UCS503 Software Engineering Laboratory • Team ArchCoders</span>
              <span>•</span>
              <a
                href="https://github.com/adityaraj868/revaudit"
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-slate-200 flex items-center space-x-1"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

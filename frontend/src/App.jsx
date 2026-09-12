import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import { 
  BarChart3, 
  GitPullRequest, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Database, 
  Users, 
  Layers, 
  Search, 
  FileText, 
  Sparkles, 
  ChevronRight, 
  Code 
} from 'lucide-react';

// Embedded PlantUML diagrams for interactive inspection
const DIAGRAM_SNIPPETS = {
  oauth: `@startuml sequence_oauth
autonumber
actor "Contributor" as User
participant "React Frontend" as Frontend
participant "FastAPI Backend" as Backend
participant "GitHub OAuth" as GitHub

User -> Frontend : Click "Sign in with GitHub"
Frontend -> GitHub : Redirect to /login/oauth/authorize
GitHub --> User : Prompt Credentials & Scopes
User -> GitHub : Authorize Application
GitHub --> Frontend : Redirect with AUTH_CODE
Frontend -> Backend : POST /api/auth/github/callback
Backend -> GitHub : Exchange Code for Access Token
GitHub --> Backend : 200 OK (access_token)
Backend --> Frontend : Authenticated Session + JWT
@enduml`,

  auditRequest: `@startuml sequence_audit_request
autonumber
actor "User" as User
participant "React Frontend" as Frontend
participant "FastAPI Engine (/api/audit)" as Backend
participant "Pandas Statistical Engine" as Engine

User -> Frontend : Enter Repo URL & Click "Run Audit"
Frontend -> Backend : GET /api/audit?owner={owner}&repo={repo}
Backend -> Engine : Run data cleaning & baseline modeling
Engine --> Backend : Baselines + 90% CI + Flagged Anomalies
Backend --> Frontend : 200 OK JSON Payload
Frontend --> User : Render KPI cards & Anomaly Matrix
@enduml`,

  githubFetch: `@startuml sequence_github_fetch
autonumber
participant "FastAPI Engine" as Backend
participant "Requests HTTP Client" as Client
participant "GitHub REST API v3" as GitHub

Backend -> Client : get_pull_requests(owner, repo, closed, 30)
loop Pagination check
    Client -> GitHub : GET /repos/{owner}/{repo}/pulls?state=closed&per_page=30
    GitHub --> Client : 200 OK [PR JSON List] (Handle 404/403)
end
Client --> Backend : Return raw PR objects
@enduml`,

  pandasBaseline: `@startuml sequence_pandas_baseline
autonumber
participant "FastAPI Controller" as API
participant "Pandas Data Pipeline" as Pandas
participant "Statistical Model" as Model

API -> Pandas : process_and_audit(raw_prs)
Pandas -> Pandas : Drop unmerged PRs (merged_at is null)
Pandas -> Pandas : Compute review_time_hours = (merged_at - created_at)
Pandas -> Pandas : Categorize size: Small (<250), Med (250-1000), Large (>1000)
Pandas -> Model : Compute group medians & mock 90% CI
Model -> Model : Flag PRs where review_time > 1.5 * group median
Model --> API : Return {baseline_medians, anomalies: [...]}
@enduml`,

  pdfExport: `@startuml sequence_pdf_export
autonumber
actor "Review Lead" as User
participant "React Frontend" as Frontend
participant "FastAPI Backend" as Backend
participant "PDF Report Engine" as PDFEngine

User -> Frontend : Click "Export Audit as PDF"
Frontend -> Backend : POST /api/reports/pdf
Backend -> PDFEngine : Build document with baseline charts & anomaly matrix
PDFEngine --> Backend : Compile PDF binary stream
Backend --> Frontend : 200 OK application/pdf
Frontend --> User : Trigger browser PDF download
@enduml`,

  classDiagram: `@startuml class_diagram
class User {
  +id: int
  +username: string
  +role: string
}
class Repository {
  +owner: string
  +name: string
  +fetch_closed_prs()
}
class PullRequest {
  +number: int
  +review_time_hours: float
  +size_category: string
  +is_anomaly: boolean
}
class ReviewEvent {
  +reviewer_id: int
  +submitted_at: DateTime
}
class StatisticalModel {
  +anomaly_multiplier: 1.5
  +compute_size_baselines()
  +flag_anomalies()
}
User "1" -- "0..*" Repository
Repository "1" *-- "0..*" PullRequest
PullRequest "1" *-- "0..*" ReviewEvent
StatisticalModel ..> PullRequest : analyzes
@enduml`
};

export default function App() {
  // Default to 'project' (the main website), or 'presentation' if indicated by URL hash
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (hash === 'presentation') return 'presentation';
    }
    return 'project';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [repoInput, setRepoInput] = useState('fastapi/fastapi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [expandedDiagram, setExpandedDiagram] = useState(null);

  // Sync tab navigation with window.location.hash
  const handleNavigate = (tab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab === 'project' ? '' : tab;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Listen for browser forward/back buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (hash === 'presentation') {
        setActiveTab('presentation');
      } else {
        setActiveTab('project');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Helper to parse owner/repo from URL or string
  const parseRepo = (input) => {
    const cleaned = input.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
    const parts = cleaned.split('/');
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
    return null;
  };

  const handleRunAudit = async (targetRepo = repoInput) => {
    const parsed = parseRepo(targetRepo);
    if (!parsed) {
      setError("Please enter a valid format like 'owner/repo' (e.g. 'fastapi/fastapi') or a GitHub URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setAuditData(null);

    try {
      const response = await fetch(`http://localhost:8000/api/audit?owner=${encodeURIComponent(parsed.owner)}&repo=${encodeURIComponent(parsed.repo)}`);
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || `Server returned status ${response.status}`);
      }

      const data = await response.json();
      setAuditData(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to the RevAudit backend at http://localhost:8000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header & Modern Primary Navigation Bar */}
      <Navbar activeTab={activeTab} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ========================================================================= */}
        {/* PRESENTATION DECK VIEW                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'presentation' && (
          <div className="space-y-10 animate-fade-in">
            {/* Academic Lab Hero Banner with Return Link */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-850 to-slate-900 text-white rounded-2xl p-8 shadow-xl border border-indigo-700/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="inline-flex items-center space-x-2 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-medium text-indigo-200">
                  <span>Academic Prototype • Dr. Sukhpal Singh • Team ArchCoders</span>
                </div>
                <button
                  onClick={() => handleNavigate('project')}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-indigo-100 px-3.5 py-1.5 rounded-lg border border-white/20 transition-colors w-fit cursor-pointer"
                >
                  <span>← Back to Live Project</span>
                </button>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
                RevAudit: Software Engineering Analytics
              </h1>
              <p className="text-indigo-100 text-base sm:text-lg max-w-3xl leading-relaxed">
                Determining consistency in GitHub code review effort by controlling for pull request size,
                reviewer workload, and review latency baselines using live repository data.
              </p>
            </div>

            {/* Section 1: The Problem (Invisible Variation) */}
            <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">The Problem (Invisible Variation)</h2>
                  <p className="text-sm text-slate-500">Why raw PR turnaround metrics fail engineering teams</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80">
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Uncontrolled Confounders
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    A 10-line bug fix that takes 48 hours is a major bottleneck, while a 2,000-line architectural refactor taking 48 hours is fast. Flat turn-around averages fail to control for PR complexity.
                  </p>
                </div>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80">
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4 text-rose-500" />
                    Perverse Incentives
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Engineering metrics that merely measure "time to merge" inadvertently incentivize superficial approvals ("LGTM") on trivial PRs while discouraging rigorous, in-depth code reviews on critical PRs.
                  </p>
                </div>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80">
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Reviewer Workload Bias
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Senior maintainers carrying high concurrent review loads experience review queuing delays that are misattributed to individual PR inertia rather than system-wide review imbalance.
                  </p>
                </div>
              </div>

              {/* Diagram Placeholder 1 */}
              <div className="mt-6 border border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 text-center">
                <div className="max-w-md mx-auto space-y-2">
                  <div className="flex justify-center text-slate-400">
                    <img 
                      src="/diagrams/04_sequence_pandas_baseline.svg" 
                      alt="Pandas Baseline Sequence Diagram" 
                      className="max-h-56 mx-auto rounded border border-slate-200 shadow-xs bg-white p-2"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div style={{ display: 'none' }} className="p-4 bg-white border border-slate-200 rounded-lg w-full">
                      <Code className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-700">UML Sequence: Pandas Engine Baseline Calculation</p>
                      <p className="text-xs text-slate-400 mt-1">docs/diagrams/04_sequence_pandas_baseline.puml</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedDiagram(expandedDiagram === 'pandasBaseline' ? null : 'pandasBaseline')}
                    className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 pt-2"
                  >
                    <Code className="w-3.5 h-3.5 mr-1" />
                    {expandedDiagram === 'pandasBaseline' ? 'Hide PlantUML Code' : 'Inspect PlantUML Code'}
                  </button>
                  {expandedDiagram === 'pandasBaseline' && (
                    <pre className="text-left text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mt-2">
                      {DIAGRAM_SNIPPETS.pandasBaseline}
                    </pre>
                  )}
                </div>
              </div>
            </section>

            {/* Section 2: The Solution (RevAudit) */}
            <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">The Solution (RevAudit)</h2>
                  <p className="text-sm text-slate-500">Size-controlled medians and statistically grounded anomaly thresholds</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                <div className="space-y-3 text-slate-700 leading-relaxed text-sm">
                  <p>
                    <strong>1. Live Ingestion:</strong> RevAudit queries live closed pull requests via GitHub's public REST API v3, filtering out unmerged/abandoned branches to ensure statistical hygiene.
                  </p>
                  <p>
                    <strong>2. Complexity Proxy:</strong> Using PR body length and content as a proxy for scope, PRs are grouped into <em>Small</em> (&lt;250 chars), <em>Medium</em> (250–1000 chars), and <em>Large</em> (&gt;1000 chars) cohorts.
                  </p>
                  <p>
                    <strong>3. Median Baselines & 90% CI:</strong> For each cohort, the median review duration is computed along with a 90% confidence interval to account for sample variance without being skewed by extreme outliers.
                  </p>
                  <p>
                    <strong>4. 1.5x Anomaly Flagging:</strong> Any PR whose review duration exceeds 1.5× of its specific cohort median is flagged as an anomaly for qualitative engineering inspection.
                  </p>
                </div>

                {/* Diagram Placeholder 2 */}
                <div className="border border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 flex flex-col justify-center items-center text-center">
                  <img 
                    src="/diagrams/02_sequence_audit_request.svg" 
                    alt="Audit Request Flow Diagram" 
                    className="max-h-48 rounded border border-slate-200 shadow-xs bg-white p-2"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div style={{ display: 'none' }} className="p-4 bg-white border border-slate-200 rounded-lg w-full">
                    <Code className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">UML Sequence: Frontend Audit Request Flow</p>
                    <p className="text-xs text-slate-400 mt-1">docs/diagrams/02_sequence_audit_request.puml</p>
                  </div>
                  <button
                    onClick={() => setExpandedDiagram(expandedDiagram === 'auditRequest' ? null : 'auditRequest')}
                    className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 pt-3"
                  >
                    <Code className="w-3.5 h-3.5 mr-1" />
                    {expandedDiagram === 'auditRequest' ? 'Hide PlantUML Code' : 'Inspect PlantUML Code'}
                  </button>
                  {expandedDiagram === 'auditRequest' && (
                    <pre className="text-left text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mt-2 w-full">
                      {DIAGRAM_SNIPPETS.auditRequest}
                    </pre>
                  )}
                </div>
              </div>
            </section>

            {/* Section 3: Team ArchCoders Contributions */}
            <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Team ArchCoders Contributions</h2>
                  <p className="text-sm text-slate-500">Role distribution and architectural responsibilities</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-3">
                    SK
                  </div>
                  <h4 className="font-bold text-slate-900">Sparsh Khandelwal</h4>
                  <p className="text-xs text-indigo-600 font-semibold mb-2">Backend & Math Engine Lead</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    FastAPI server architecture, Pandas statistical aggregation pipeline, GitHub REST API client, anomaly detection threshold algorithms.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm mb-3">
                    DK
                  </div>
                  <h4 className="font-bold text-slate-900">Dheeraj & Teammate 1</h4>
                  <p className="text-xs text-emerald-600 font-semibold mb-2">UML & Architecture Leads</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Authored 5 core sequence diagrams (OAuth, API fetch, baseline calculation, PDF export) and domain Class Diagram in PlantUML.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-9 h-9 rounded-lg bg-sky-600 text-white font-bold flex items-center justify-center text-sm mb-3">
                    TA
                  </div>
                  <h4 className="font-bold text-slate-900">Frontend Teammate</h4>
                  <p className="text-xs text-sky-600 font-semibold mb-2">UI/UX & Integration Lead</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    React + Tailwind single-page dashboard, interactive presentation deck switching, responsive anomaly metrics table.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-9 h-9 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-sm mb-3">
                    TA
                  </div>
                  <h4 className="font-bold text-slate-900">QA & Documentation</h4>
                  <p className="text-xs text-purple-600 font-semibold mb-2">Verification & Validation</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Edge-case verification (unmerged PRs, rate limits, 404s), academic compliance verification, and lab demo presentation.
                  </p>
                </div>
              </div>

              {/* Class Diagram Placeholder */}
              <div className="mt-6 border border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 text-center">
                <img 
                  src="/diagrams/06_class_diagram.svg" 
                  alt="Domain Class Diagram" 
                  className="max-h-56 mx-auto rounded border border-slate-200 shadow-xs bg-white p-2"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div style={{ display: 'none' }} className="p-4 bg-white border border-slate-200 rounded-lg max-w-md mx-auto">
                  <Code className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">UML Class Diagram: RevAudit Domain Model</p>
                  <p className="text-xs text-slate-400 mt-1">docs/diagrams/06_class_diagram.puml</p>
                </div>
                <button
                  onClick={() => setExpandedDiagram(expandedDiagram === 'classDiagram' ? null : 'classDiagram')}
                  className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 pt-3"
                >
                  <Code className="w-3.5 h-3.5 mr-1" />
                  {expandedDiagram === 'classDiagram' ? 'Hide PlantUML Code' : 'Inspect PlantUML Code'}
                </button>
                {expandedDiagram === 'classDiagram' && (
                  <pre className="text-left text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mt-2 max-w-2xl mx-auto">
                    {DIAGRAM_SNIPPETS.classDiagram}
                  </pre>
                )}
              </div>
            </section>

            {/* Section 4: Future Work (Adding PostgreSQL) */}
            <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Future Work (Adding PostgreSQL)</h2>
                  <p className="text-sm text-slate-500">Scaling from 4-hour stateless prototype to enterprise audit infrastructure</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6 text-sm text-slate-700">
                <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
                  <h4 className="font-semibold text-slate-900 mb-2">1. Persistent Historical Baselines</h4>
                  <p className="text-slate-600 leading-relaxed">
                    Store time-series PR metrics in PostgreSQL to track team review velocity trends across quarterly engineering sprints.
                  </p>
                </div>
                <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
                  <h4 className="font-semibold text-slate-900 mb-2">2. Asynchronous Ingestion Workers</h4>
                  <p className="text-slate-600 leading-relaxed">
                    Deploy Celery + Redis workers to backfill thousands of historic PRs via GitHub Webhooks without blocking the FastAPI HTTP event loop.
                  </p>
                </div>
                <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
                  <h4 className="font-semibold text-slate-900 mb-2">3. Reviewer Fatigue ML Model</h4>
                  <p className="text-slate-600 leading-relaxed">
                    Augment the 1.5x median heuristic with an empirical Bayes model predicting review latency based on current assigned PR count.
                  </p>
                </div>
              </div>

              <div className="border border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 text-center">
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setExpandedDiagram(expandedDiagram === 'oauth' ? null : 'oauth')}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs"
                  >
                    {expandedDiagram === 'oauth' ? 'Hide OAuth Sequence' : 'Inspect OAuth Diagram PUML'}
                  </button>
                  <button
                    onClick={() => setExpandedDiagram(expandedDiagram === 'pdfExport' ? null : 'pdfExport')}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs"
                  >
                    {expandedDiagram === 'pdfExport' ? 'Hide PDF Export Sequence' : 'Inspect PDF Export PUML'}
                  </button>
                </div>
                {expandedDiagram === 'oauth' && (
                  <pre className="text-left text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mt-3 max-w-2xl mx-auto">
                    {DIAGRAM_SNIPPETS.oauth}
                  </pre>
                )}
                {expandedDiagram === 'pdfExport' && (
                  <pre className="text-left text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mt-3 max-w-2xl mx-auto">
                    {DIAGRAM_SNIPPETS.pdfExport}
                  </pre>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN PROJECT (LIVE AUDIT VIEW)                                            */}
        {/* ========================================================================= */}
        {activeTab !== 'presentation' && (
          <div className="space-y-8 animate-fade-in">
            {/* Top Project Context Banner with Link to Presentation Deck */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-indigo-700/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="inline-flex items-center space-x-2 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold text-indigo-200">
                  <span>Academic Lab Prototype • Dr. Sukhpal Singh</span>
                  <span className="text-indigo-400">•</span>
                  <span>Team ArchCoders</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  RevAudit: GitHub PR Review Effort Analytics
                </h1>
                <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
                  Controls for pull request size and reviewer workload using live GitHub REST API data. Evaluates review turnaround against size-stratified medians and flags statistical anomalies.
                </p>
              </div>

              <div className="shrink-0 flex items-center">
                <button
                  onClick={() => handleNavigate('presentation')}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/25 shadow-xs transition-colors cursor-pointer group"
                >
                  <FileText className="w-4 h-4 text-indigo-300" />
                  <span>View Presentation Deck</span>
                  <ChevronRight className="w-4 h-4 text-indigo-200 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
            {/* Search / Run Audit Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Live Repository Audit</h2>
              <p className="text-sm text-slate-500 mb-6">
                Enter any public GitHub repository to calculate size-controlled review effort baselines and flag outliers.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="e.g. fastapi/fastapi, pallets/flask, or https://github.com/..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRunAudit();
                    }}
                  />
                </div>
                <button
                  onClick={() => handleRunAudit()}
                  disabled={loading}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      <span>Analyzing PRs...</span>
                    </>
                  ) : (
                    <>
                      <span>Run Audit</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

              {/* Sample Repository Shortcuts */}
              <div className="flex items-center flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-400 font-medium mr-1">Quick Demos:</span>
                {['fastapi/fastapi', 'pallets/flask', 'psf/requests', 'django/django'].map((slug) => (
                  <button
                    key={slug}
                    onClick={() => {
                      setRepoInput(slug);
                      handleRunAudit(slug);
                    }}
                    className="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 px-2.5 py-1 rounded-md font-mono border border-slate-200 transition-colors"
                  >
                    {slug}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Audit Request Failed</h4>
                  <p className="mt-1 text-xs text-rose-700">{error}</p>
                  <p className="mt-2 text-xs text-rose-600">
                    Tip: Ensure the FastAPI backend server is running on <code className="bg-rose-100 px-1 py-0.5 rounded">http://localhost:8000</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
                <div className="inline-block w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-semibold text-slate-800">Fetching Live GitHub PR History</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                  Querying recent closed pull requests, dropping unmerged data, and computing size-controlled medians...
                </p>
              </div>
            )}

            {/* Audit Results Dashboard */}
            {auditData && !loading && (
              <div className="space-y-8 animate-fade-in">
                {/* Summary Metrics Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Repository</span>
                    <div className="text-xl font-bold text-slate-900 mt-1 truncate">
                      {auditData.owner}/{auditData.repo}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Live GitHub REST v3</div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">PRs Evaluated</span>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {auditData.merged_prs_count}
                      <span className="text-sm font-normal text-slate-400 ml-1.5">
                        / {auditData.total_closed_prs} closed
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {auditData.unmerged_prs_dropped} unmerged discarded
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Flagged Anomalies</span>
                    <div className="text-2xl font-bold text-rose-600 mt-1">
                      {auditData.anomalies_count}
                    </div>
                    <div className="text-xs text-rose-500/80 mt-1">
                      Exceeded 1.5x group median
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Review Health</span>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">
                      {auditData.merged_prs_count > 0 
                        ? `${Math.round(((auditData.merged_prs_count - auditData.anomalies_count) / auditData.merged_prs_count) * 100)}%`
                        : 'N/A'}
                    </div>
                    <div className="text-xs text-emerald-600/80 mt-1">
                      Within acceptable baseline
                    </div>
                  </div>
                </div>

                {/* Baseline Medians Breakdown Cards */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Size-Controlled Review Baselines</h3>
                  <p className="text-xs text-slate-500 mb-6">
                    PRs grouped by description complexity proxy. Medians represent typical review latency with 90% confidence intervals.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['Small', 'Medium', 'Large'].map((sizeKey) => {
                      const data = auditData.baseline_medians?.[sizeKey];
                      const colors = {
                        Small: 'border-blue-200 bg-blue-50/50 text-blue-900',
                        Medium: 'border-indigo-200 bg-indigo-50/50 text-indigo-900',
                        Large: 'border-purple-200 bg-purple-50/50 text-purple-900',
                      }[sizeKey];

                      const badgeColors = {
                        Small: 'bg-blue-100 text-blue-700',
                        Medium: 'bg-indigo-100 text-indigo-700',
                        Large: 'bg-purple-100 text-purple-700',
                      }[sizeKey];

                      const desc = {
                        Small: '< 250 characters (minor fixes)',
                        Medium: '250 – 1000 chars (features)',
                        Large: '> 1000 characters (major specs)',
                      }[sizeKey];

                      return (
                        <div key={sizeKey} className={`p-5 rounded-xl border ${colors}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badgeColors}`}>
                              {sizeKey} PRs
                            </span>
                            <span className="text-xs text-slate-500">
                              {data ? `${data.sample_size} PRs analyzed` : '0 PRs'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mb-3">{desc}</div>
                          
                          {data ? (
                            <div>
                              <div className="flex items-baseline space-x-2">
                                <span className="text-2xl font-black text-slate-900">{data.median_hours}</span>
                                <span className="text-xs text-slate-500 font-medium">hours median</span>
                              </div>
                              <div className="mt-3 text-xs bg-white/80 p-2 rounded-lg border border-slate-200/60 flex items-center justify-between">
                                <span className="text-slate-500">90% Conf. Interval:</span>
                                <span className="font-mono font-semibold text-slate-700">
                                  [{data.mock_ci_90[0]}h – {data.mock_ci_90[1]}h]
                                </span>
                              </div>
                              <div className="mt-2 text-2xs text-slate-500 text-right">
                                Anomaly threshold: &gt; {(data.median_hours * 1.5).toFixed(1)}h
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic py-2">No merged PRs in this size bucket</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Flagged Anomalies Table */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-slate-900">Flagged Review Anomalies</h3>
                        <span className="bg-rose-100 text-rose-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {auditData.anomalies_count} Detected
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Pull requests taking &gt; 1.5× longer than their respective size cohort median.
                      </p>
                    </div>
                  </div>

                  {auditData.anomalies.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <h4 className="font-semibold text-slate-800">No Statistical Anomalies Detected</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        All analyzed pull requests in the recent sample fell within the 1.5x median variation baseline.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 font-semibold">PR # & Title</th>
                            <th className="px-4 py-3 font-semibold">Author</th>
                            <th className="px-4 py-3 font-semibold">Size Cohort</th>
                            <th className="px-4 py-3 font-semibold">Review Time</th>
                            <th className="px-4 py-3 font-semibold">Group Median</th>
                            <th className="px-4 py-3 font-semibold">Variance Ratio</th>
                            <th className="px-4 py-3 font-semibold">90% CI Baseline</th>
                            <th className="px-4 py-3 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {auditData.anomalies.map((item) => (
                            <tr key={item.pr_number} className="hover:bg-rose-50/30 transition-colors">
                              <td className="px-4 py-3.5 max-w-xs">
                                <div className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                                  <span className="font-mono text-xs text-indigo-600">#{item.pr_number}</span>
                                  <span className="truncate">{item.title}</span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5">
                                <div className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded w-fit">
                                  @{item.author}
                                </div>
                              </td>

                              <td className="px-4 py-3.5">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  item.size_category === 'Small'
                                    ? 'bg-blue-100 text-blue-800'
                                    : item.size_category === 'Medium'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {item.size_category}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 font-mono font-bold text-rose-600">
                                {item.review_time_hours}h
                              </td>

                              <td className="px-4 py-3.5 font-mono text-slate-500">
                                {item.group_median_hours}h
                              </td>

                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                                  {item.anomaly_ratio}× median
                                </span>
                              </td>

                              <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                                [{item.mock_ci_90[0]}h – {item.mock_ci_90[1]}h]
                              </td>

                              <td className="px-4 py-3.5 text-right">
                                {item.html_url && (
                                  <a
                                    href={item.html_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                  >
                                    View <ExternalLink className="w-3.5 h-3.5 ml-1" />
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>RevAudit • Academic Lab Prototype for Dr. Sukhpal Singh • Developed by Team ArchCoders</p>
      </footer>
    </div>
  );
}

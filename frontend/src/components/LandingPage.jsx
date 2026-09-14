import React, { useRef, useEffect } from 'react';
import { 
  ArrowRight, 
  BarChart3, 
  ShieldCheck, 
  Layers, 
  Scale, 
  ExternalLink,
  Filter,
  Eye,
  ChevronRight
} from 'lucide-react';
import heroVideoSrc from '../../../design/hero-background.mp4';
import iconSvgSrc from '../../../design/icon.svg';

export default function LandingPage({ 
  onOpenAudit, 
  onNavigateToMethodology, 
  onNavigateToPresentation 
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.8;
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-orange-500/30 selection:text-orange-200">
      
      {/* ========================================================================= */}
      {/* 1. HERO SECTION WITH CINEMATIC BACKGROUND VIDEO                           */}
      {/* ========================================================================= */}
      <div className="relative min-h-[90vh] sm:min-h-screen flex flex-col justify-between overflow-hidden">
        
        {/* Background Video Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            onLoadedMetadata={(e) => {
              e.target.playbackRate = 0.8;
            }}
            key={heroVideoSrc}
            className="w-full h-full object-cover scale-105"
            src={heroVideoSrc}
          >
            <source src={heroVideoSrc} type="video/mp4" />
            <source src="/design/hero-background.mp4" type="video/mp4" />
          </video>
          {/* Subtle Dark Overlay to preserve crisp readability (60% opacity) */}
          <div className="absolute inset-0 bg-[#07090e]/60 bg-gradient-to-b from-[#07090e]/60 via-[#07090e]/50 to-[#07090e]" />
        </div>

        {/* Minimal Transparent Top Navigation Layer */}
        <nav className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-20 flex items-center justify-between">
          
          {/* Brand with icon.svg */}
          <div className="flex items-center space-x-3">
            <img 
              src={iconSvgSrc || "/design/icon.svg"} 
              alt="RevAudit Logo" 
              className="w-6 h-6 invert opacity-60 object-contain"
              onError={(e) => {
                e.target.src = '/icon.svg';
              }}
            />
            <span className="font-semibold text-lg tracking-tight text-white">
              RevAudit
            </span>
          </div>

          {/* Minimal Nav Links */}
          <div className="hidden md:flex items-center space-x-8 text-sm text-slate-300 font-medium">
            <a 
              href="#features" 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors"
            >
              Features
            </a>
            <a 
              href="#methodology" 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('methodology-section')?.scrollIntoView({ behavior: 'smooth' });
              }} 
              className="hover:text-white transition-colors"
            >
              Methodology
            </a>
            <button 
              onClick={onNavigateToPresentation} 
              className="hover:text-white transition-colors cursor-pointer"
            >
              Presentation
            </button>
            <a 
              href="https://github.com/adityaraj868/revaudit" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-white transition-colors flex items-center space-x-1"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>

          {/* Nav Primary CTA */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenAudit}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm rounded-lg transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Open Audit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </nav>

        {/* Hero Content Area - Left Aligned */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24 my-auto space-y-8 text-left">
          
          <div className="max-w-3xl space-y-8 mr-auto">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 text-xs font-mono tracking-wider uppercase backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
              <span>Statistical Code-Review Analysis</span>
            </div>

            {/* Large Clean Heading */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08]">
              Understand <br />
              how code reviews <br />
              <span className="text-orange-400">actually behave.</span>
            </h1>

            {/* Short Description */}
            <p className="text-base sm:text-xl text-slate-300 max-w-2xl leading-relaxed font-normal">
              RevAudit analyzes GitHub pull-request and review history to identify unusual review-effort patterns while accounting for repository, pull-request and reviewer workload.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={onOpenAudit}
                className="px-6 py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm sm:text-base rounded-lg transition-all shadow-lg flex items-center space-x-2 cursor-pointer"
              >
                <span>Open Audit</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onNavigateToMethodology}
                className="px-6 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white font-medium text-sm sm:text-base rounded-lg border border-slate-700/80 backdrop-blur-sm transition-all cursor-pointer"
              >
                Explore Methodology
              </button>
            </div>
          </div>

        </div>

        {/* Hero Bottom subtle fade */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 w-full flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/40 font-mono">
          <span>Non-Parametric Medians • 90% Confidence Bounds</span>
          <span>UCS503 Software Engineering</span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. AFTER THE HERO: CORE CONCEPT SECTION                                   */}
      {/* ========================================================================= */}
      <section className="border-t border-b border-slate-800/80 bg-[#090c12] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="max-w-3xl space-y-3">
            <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Review activity isn't enough.
            </h2>
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
              RevAudit accounts for the factors that naturally affect review effort, controlling for confounding variables before flagging deviations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 pt-4">
            
            {/* Column 01 */}
            <div className="space-y-3 border-t border-slate-800 pt-6">
              <div className="text-xs font-mono font-bold text-orange-400">01</div>
              <h3 className="text-lg font-semibold text-white">Pull-request complexity</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Stratifies pull requests by change scope and description length (L_body), preventing 5-line typo patches from skewing baselines for 2,000-line subsystem refactors.
              </p>
            </div>

            {/* Column 02 */}
            <div className="space-y-3 border-t border-slate-800 pt-6">
              <div className="text-xs font-mono font-bold text-orange-400">02</div>
              <h3 className="text-lg font-semibold text-white">Reviewer workload</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Measures turnaround latency distribution and queue backpressure across cohorts to detect systemic bottlenecks rather than evaluating individual developers.
              </p>
            </div>

            {/* Column 03 */}
            <div className="space-y-3 border-t border-slate-800 pt-6">
              <div className="text-xs font-mono font-bold text-orange-400">03</div>
              <h3 className="text-lg font-semibold text-white">Repository context</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Derives empirical non-parametric medians from live repository history, guaranteeing 50% breakdown-point resistance against long-tail skew.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FEATURE SECTION                                                        */}
      {/* ========================================================================= */}
      <section id="features" className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        <div className="max-w-2xl space-y-3">
          <div className="text-xs font-mono font-semibold text-orange-400 uppercase tracking-wider">
            Analytical Foundation
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Engineered for empirical rigor.
          </h2>
          <p className="text-base text-slate-400 leading-relaxed">
            Six statistical principles replace arbitrary velocity thresholds with reproducible, confounder-controlled bounds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5">
            <BarChart3 className="w-5 h-5 text-orange-400 mb-2" />
            <h3 className="text-base font-semibold text-white">Statistical Analysis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Non-parametric median baselines resist skew caused by multi-month inactive pull requests.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5">
            <Layers className="w-5 h-5 text-orange-400 mb-2" />
            <h3 className="text-base font-semibold text-white">Hierarchical Modeling</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Stratifies by repository, size bucket, and complexity tier before computing deviation metrics.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5">
            <Eye className="w-5 h-5 text-orange-400 mb-2" />
            <h3 className="text-base font-semibold text-white">Uncertainty Estimation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calculates 90% confidence intervals via median standard error to flag low-sample uncertainty.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5">
            <Scale className="w-5 h-5 text-orange-400 mb-2" />
            <h3 className="text-base font-semibold text-white">Repository Comparison</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Benchmark review process health against real open-source repositories like FastAPI, Flask, and React.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5">
            <Filter className="w-5 h-5 text-orange-400 mb-2" />
            <h3 className="text-base font-semibold text-white">Survival-Bias Correction</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Discards rejected and abandoned branches to isolate completed integration cycles.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5">
            <ShieldCheck className="w-5 h-5 text-orange-400 mb-2" />
            <h3 className="text-base font-semibold text-white">Evidence-Based Patterns</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every flagged anomaly links to a 6-tier credibility dossier with measured deviation and confounder context.
            </p>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 4. METHODOLOGY PIPELINE SECTION                                           */}
      {/* ========================================================================= */}
      <section id="methodology-section" className="border-t border-slate-800/80 bg-[#090c12] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-mono font-semibold text-orange-400 uppercase tracking-wider">
              Data Processing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              End-to-end analytical pipeline.
            </h2>
            <p className="text-base text-slate-400 leading-relaxed">
              From raw GitHub REST API events to size-controlled outlier classification.
            </p>
          </div>

          {/* Minimal Pipeline Diagram */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
            
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[10px] text-orange-400 font-bold block">01</span>
              <strong className="text-white block font-sans">GitHub API</strong>
              <p className="text-[11px] text-slate-400 font-sans">REST v3 closed PRs ingestion</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[10px] text-orange-400 font-bold block">02</span>
              <strong className="text-white block font-sans">Survival Filter</strong>
              <p className="text-[11px] text-slate-400 font-sans">Discard unmerged proposals</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[10px] text-orange-400 font-bold block">03</span>
              <strong className="text-white block font-sans">Stratification</strong>
              <p className="text-[11px] text-slate-400 font-sans">Small / Medium / Large proxy</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[10px] text-orange-400 font-bold block">04</span>
              <strong className="text-white block font-sans">Medians &amp; CI₉₀</strong>
              <p className="text-[11px] text-slate-400 font-sans">50% breakdown-point modeling</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[10px] text-orange-400 font-bold block">05</span>
              <strong className="text-white block font-sans">1.5x Multiplier</strong>
              <p className="text-[11px] text-slate-400 font-sans">Size-relative anomaly rule</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[10px] text-orange-400 font-bold block">06</span>
              <strong className="text-white block font-sans">Evidence Dossier</strong>
              <p className="text-[11px] text-slate-400 font-sans">6-level credibility verification</p>
            </div>

          </div>

          <div className="flex items-center space-x-4 pt-2">
            <button
              onClick={onNavigateToMethodology}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Explore Full Pipeline &amp; PlantUML Models</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. ETHICS & SAFEGUARDS SECTION                                            */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="max-w-2xl space-y-3">
          <div className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
            Responsible Engineering
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Patterns, not accusations.
          </h2>
          <p className="text-base text-slate-400 leading-relaxed">
            RevAudit explicitly evaluates organizational review processes and queue latency. It does not rank individual developers or label reviewers as biased.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="text-xs font-mono font-semibold text-emerald-400">Process Health</div>
            <h3 className="text-sm font-semibold text-white">No Individual Blame</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Identifies queueing friction, CI bottlenecks, and delegation lag rather than assigning developer verdicts.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="text-xs font-mono font-semibold text-blue-400">90% CI Bounds</div>
            <h3 className="text-sm font-semibold text-white">Explicit Uncertainty</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              All statistical findings include confidence interval margins to prevent overconfident conclusions on small samples.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="text-xs font-mono font-semibold text-slate-400">Triage Filter</div>
            <h3 className="text-sm font-semibold text-white">Human-in-the-Loop</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Anomaly flags serve purely as qualitative triage signals for engineering leads inspecting commit context.
            </p>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 6. FINAL CTA BANNER                                                       */}
      {/* ========================================================================= */}
      <section className="border-t border-slate-800/80 bg-[#090c12] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Audit review processes with evidence.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Run live statistical audits on any open-source GitHub repository or explore the complete evaluation deck.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenAudit}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm rounded-lg transition-all shadow-md flex items-center space-x-2 cursor-pointer"
            >
              <span>Open RevAudit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNavigateToPresentation}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-sm rounded-lg border border-slate-800 transition-all cursor-pointer"
            >
              Explore Presentation Deck
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. PRODUCT FOOTER                                                         */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-800/60 bg-[#07090e] py-8 text-xs text-slate-500 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">RevAudit</span>
            <span>•</span>
            <span>Statistical Audit of Code-Review Consistency</span>
          </div>

          <div className="flex items-center space-x-4 text-slate-400">
            <span>UCS503 Software Engineering • Team ArchCoders</span>
            <span>•</span>
            <a
              href="https://github.com/adityaraj868/revaudit"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-200 flex items-center space-x-1"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}

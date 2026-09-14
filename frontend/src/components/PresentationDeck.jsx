import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Mic, 
  Code, 
  Presentation 
} from 'lucide-react';
import { PRESENTATION_SLIDES } from '../data/presentationData';
import { UML_DIAGRAMS } from '../data/diagramsData';

export default function PresentationDeck({ onNavigateToAudit }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(true);
  const [expandedDiagram, setExpandedDiagram] = useState(false);

  const slide = PRESENTATION_SLIDES[currentSlideIndex];
  const totalSlides = PRESENTATION_SLIDES.length;

  const nextSlide = () => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        if (currentSlideIndex < totalSlides - 1) {
          setCurrentSlideIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentSlideIndex > 0) {
          setCurrentSlideIndex(prev => prev - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, totalSlides]);

  const slideDiagram = slide.diagramId ? UML_DIAGRAMS.find(d => d.id === slide.diagramId) : null;

  return (
    <div className="space-y-4">
      {/* Top Slide Deck Navigation Toolbar */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Presentation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-white">
                Academic Evaluation Deck
              </span>
              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                Slide {slide.num} of 0{totalSlides}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Team ArchCoders • UCS503 Software Engineering
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowSpeakerNotes(!showSpeakerNotes)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center space-x-1.5 cursor-pointer border ${
              showSpeakerNotes
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
            }`}
            title="Toggle Speaker Speaking Notes"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Speaker Notes</span>
          </button>

          <button
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={nextSlide}
            disabled={currentSlideIndex === totalSlides - 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
            title="Next Slide (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide Thumbnails / Progress Strip */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 font-mono text-xs">
        {PRESENTATION_SLIDES.map((s, idx) => {
          const isActive = idx === currentSlideIndex;
          return (
            <button
              key={s.id}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer truncate ${
                isActive
                  ? 'bg-indigo-600 text-white font-bold border-indigo-400 shadow-xs'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span className="text-[10px] block opacity-75">{s.num}</span>
              <span className="text-[11px] truncate block">{s.category}</span>
            </button>
          );
        })}
      </div>

      {/* Main Slide Card */}
      <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl min-h-[460px] flex flex-col justify-between space-y-6 animate-fade-in">
        
        {/* Slide Header */}
        <div className="border-b border-slate-800/80 pb-4 space-y-1">
          <div className="flex items-center space-x-2 text-xs font-mono text-indigo-400 uppercase font-semibold">
            <span>Slide {slide.num}</span>
            <span>•</span>
            <span>{slide.category}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
            {slide.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed">
            {slide.subtitle}
          </p>
        </div>

        {/* Slide Dynamic Content Body */}
        <div className="flex-1 space-y-5">
          
          {/* Slide 1: Introduction Metadata */}
          {slide.id === '01_title' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                {slide.keyPoints.map((kp, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <span className="text-indigo-400 font-bold text-xs uppercase block">{kp.title}</span>
                    <p className="text-slate-300 font-sans text-xs leading-relaxed">{kp.text}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="space-y-0.5">
                  <span className="text-indigo-300 font-bold block">Team ArchCoders Presentation</span>
                  <span className="text-slate-400">Sparsh Khandelwal • Dheeraj • Frontend Teammate • QA Teammate</span>
                </div>
                <button
                  onClick={onNavigateToAudit}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center space-x-1 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Launch Live Demo</span>
                </button>
              </div>
            </div>
          )}

          {/* Slide 2: The Problem */}
          {slide.id === '02_problem' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                {slide.keyPoints.map((kp, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <span className="text-amber-400 font-bold text-xs uppercase block">{kp.title}</span>
                    <p className="text-slate-300 font-sans text-xs leading-relaxed">{kp.text}</p>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-300">
                <strong className="text-cyan-400 uppercase text-[10px] block mb-1">Academic Takeaway:</strong>
                <p className="font-sans">{slide.statisticalTakeaway}</p>
              </div>
            </div>
          )}

          {/* Slide 3: Solution Pipeline */}
          {slide.id === '03_solution' && (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 font-mono text-xs">
              {slide.stages.map((stg, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 flex flex-col justify-between">
                  <span className="text-cyan-400 font-bold text-xs">{stg.step}</span>
                  <p className="text-slate-300 font-sans text-[11px] leading-snug">{stg.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Slide 4: Empirical Case Study Matrix */}
          {slide.id === '04_validation' && slide.caseStudy && (
            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase">Target Repository</span>
                  <strong className="text-cyan-400 block text-sm">{slide.caseStudy.repo}</strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase">Ingested Closed PRs</span>
                  <strong className="text-slate-200 block text-sm">{slide.caseStudy.totalClosed} PRs</strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase">Merged PRs (Imputed)</span>
                  <strong className="text-emerald-400 block text-sm">{slide.caseStudy.mergedCount} PRs</strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase">Flagged Anomalies</span>
                  <strong className="text-rose-400 block text-sm">{slide.caseStudy.anomaliesCount} PR</strong>
                </div>
              </div>

              {/* Cohort Baselines Table */}
              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Empirical Cohort Baselines:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {slide.caseStudy.cohorts.map((c, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-slate-200">
                        <span>{c.name}</span>
                        <span className="text-cyan-400">n = {c.n}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Median Latency (x̃):</span>
                        <strong className="text-white">{c.median}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>90% CI:</span>
                        <span>{c.ci}</span>
                      </div>
                      <div className="flex justify-between text-amber-400 text-[11px]">
                        <span>Anomaly Threshold:</span>
                        <span>{c.threshold}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anomaly Highlight */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold">
                    Anomaly Highlight: {slide.caseStudy.anomalyHighlight.pr} ({slide.caseStudy.anomalyHighlight.title})
                  </span>
                  <span className="text-rose-400 font-black">
                    {slide.caseStudy.anomalyHighlight.ratio}
                  </span>
                </div>
                <p className="text-slate-300 font-sans text-xs leading-relaxed">
                  {slide.caseStudy.anomalyHighlight.finding}
                </p>
              </div>
            </div>
          )}

          {/* Slide 5: System Architecture */}
          {slide.id === '05_architecture' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              {slide.architecturePoints.map((arch, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <span className="text-cyan-400 font-bold text-xs uppercase block">{arch.layer}</span>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed">{arch.details}</p>
                </div>
              ))}
            </div>
          )}

          {/* Slide 6: Team Contributions */}
          {slide.id === '06_team' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              {slide.members.map((mem, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-white text-xs block">{mem.name}</strong>
                      <span className="text-[11px] text-slate-400">{mem.role}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      {mem.badge}
                    </span>
                  </div>
                  <ul className="text-[11px] text-slate-300 font-sans list-disc list-inside space-y-1">
                    {mem.deliverables.map((del, dIdx) => (
                      <li key={dIdx}>{del}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Slide 7: Roadmap */}
          {slide.id === '07_roadmap' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              {slide.roadmapItems.map((rd, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <span className="text-indigo-400 font-bold text-xs uppercase block">{rd.title}</span>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed">{rd.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Slide 8: Ethics */}
          {slide.id === '08_ethics' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {slide.principles.map((pr, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <span className="text-emerald-400 font-bold text-xs uppercase block">{pr.title}</span>
                    <p className="text-slate-300 font-sans text-xs leading-relaxed">{pr.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
                <span className="text-slate-200 font-sans text-xs">
                  Ready to test live repositories? Switch to the operational audit console.
                </span>
                <button
                  onClick={onNavigateToAudit}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0 font-mono"
                >
                  Live Audit Console →
                </button>
              </div>
            </div>
          )}

          {/* Embedded Diagram if Slide references one */}
          {slideDiagram && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-center justify-between mb-2 font-mono text-xs">
                <span className="text-cyan-400 font-bold flex items-center space-x-1.5">
                  <Code className="w-3.5 h-3.5" />
                  <span>Referenced Architectural Diagram: {slideDiagram.title}</span>
                </span>
                <button
                  onClick={() => setExpandedDiagram(!expandedDiagram)}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  {expandedDiagram ? 'Hide SVG' : 'Inspect Diagram SVG'}
                </button>
              </div>
              {expandedDiagram && (
                <div className="p-2 bg-white rounded-lg border border-slate-700 animate-fade-in">
                  <img
                    src={slideDiagram.svgPath}
                    alt={slideDiagram.title}
                    className="max-h-64 mx-auto object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Speaker Notes Drawer (Toggled) */}
        {showSpeakerNotes && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1 font-mono text-xs animate-fade-in">
            <div className="flex items-center space-x-1.5 text-amber-400 font-semibold text-[11px] uppercase tracking-wider">
              <Mic className="w-3.5 h-3.5" />
              <span>Speaker Presentation Notes</span>
            </div>
            <p className="text-slate-200 font-sans text-xs leading-relaxed italic">
              &ldquo;{slide.speakerNotes}&rdquo;
            </p>
          </div>
        )}

        {/* Slide Progress Indicator Bar */}
        <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden border border-slate-800">
          <div 
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${((currentSlideIndex + 1) / totalSlides) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

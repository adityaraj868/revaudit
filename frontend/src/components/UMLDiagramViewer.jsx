import React, { useState, useEffect } from 'react';
import { 
  Code, 
  Image as ImageIcon, 
  Copy, 
  Check 
} from 'lucide-react';
import { UML_DIAGRAMS } from '../data/diagramsData';

export default function UMLDiagramViewer({ initialDiagramId = '02_sequence_audit_request' }) {
  const [activeDiagramId, setActiveDiagramId] = useState(initialDiagramId);
  const [viewMode, setViewMode] = useState('diagram');
  const [copied, setCopied] = useState(false);
  const [pumlCode, setPumlCode] = useState('');

  const currentDiagram = UML_DIAGRAMS.find(d => d.id === activeDiagramId) || UML_DIAGRAMS[0];

  useEffect(() => {
    let isMounted = true;
    const pumlUrl = currentDiagram.pumlPath || `${import.meta.env.BASE_URL}diagrams/${currentDiagram.id}.puml`;

    fetch(pumlUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (isMounted && text && !text.includes('<!doctype html>')) {
          setPumlCode(text);
        } else if (isMounted) {
          setPumlCode(currentDiagram.puml);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPumlCode(currentDiagram.puml);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentDiagram]);

  const handleCopyCode = () => {
    const codeToCopy = pumlCode || currentDiagram.puml;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-950 border border-slate-800">
        {UML_DIAGRAMS.map((diag) => {
          const isActive = diag.id === activeDiagramId;
          return (
            <button
              key={diag.id}
              onClick={() => setActiveDiagramId(diag.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                isActive
                  ? 'bg-blue-600/15 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <span className="text-[10px] text-blue-400 font-semibold">{diag.num}</span>
              <span className="truncate max-w-[140px] sm:max-w-none">{diag.title}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-blue-400">
                UML {currentDiagram.num} • {currentDiagram.type}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-xs text-slate-200 font-medium truncate">
                {currentDiagram.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              {currentDiagram.description}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800">
              <button
                onClick={() => setViewMode('diagram')}
                className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center space-x-1 ${
                  viewMode === 'diagram'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3 h-3" />
                <span>Visual</span>
              </button>
              <button
                onClick={() => setViewMode('source')}
                className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center space-x-1 ${
                  viewMode === 'source'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3 h-3" />
                <span>PlantUML</span>
              </button>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition-colors border border-slate-700 flex items-center space-x-1"
              title="Copy PlantUML code to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy PUML</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-slate-950/40">
          {viewMode === 'diagram' ? (
            <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-slate-800/80 min-h-[360px] overflow-auto">
              <img
                src={currentDiagram.svgPath}
                alt={currentDiagram.title}
                className="max-h-[460px] w-auto max-w-full rounded-lg shadow-md border border-slate-800 bg-white p-2 object-contain"
              />
            </div>
          ) : (
            <div className="relative">
              <pre className="text-xs font-mono text-cyan-200/90 bg-slate-950 p-5 rounded-xl border border-slate-800 overflow-x-auto leading-relaxed max-h-[500px]">
                {pumlCode || currentDiagram.puml}
              </pre>
            </div>
          )}
        </div>

        <div className="px-5 py-2.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Source: {currentDiagram.sourceFile}</span>
          <span>Lead: Dheeraj (UML &amp; Architecture Lead)</span>
        </div>
      </div>
    </div>
  );
}

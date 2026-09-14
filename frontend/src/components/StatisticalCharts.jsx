import React, { useState } from 'react';
import { BarChart2, ScatterChart } from 'lucide-react';

export function CohortLatencyChart({ baselineMedians = {} }) {
  const [hoveredCohort, setHoveredCohort] = useState(null);

  const cohortKeys = ['Small', 'Medium', 'Large'];
  const cohortsData = cohortKeys.map((key) => {
    const d = baselineMedians?.[key];
    const median = d ? d.median_hours : 0;
    const ciLower = d && d.mock_ci_90 ? d.mock_ci_90[0] : 0;
    const ciUpper = d && d.mock_ci_90 ? d.mock_ci_90[1] : 0;
    const sample = d ? d.sample_size : 0;
    const threshold = median * 1.5;
    return { key, median, ciLower, ciUpper, sample, threshold };
  });

  const maxVal = Math.max(
    ...cohortsData.map(c => Math.max(c.threshold, c.ciUpper)),
    10.0
  );

  const chartHeight = 200;
  const chartWidth = 520;
  const padding = { top: 20, right: 30, bottom: 35, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const yScale = (val) => innerHeight - (val / (maxVal * 1.15)) * innerHeight;
  const colWidth = innerWidth / cohortsData.length;

  return (
    <div className="p-4 rounded-lg border border-slate-800 bg-slate-900 flex flex-col justify-between space-y-3 font-sans">
      <div>
        <h4 className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
          <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Cohort Medians &amp; 90% Confidence Intervals</span>
        </h4>
        <p className="text-xs text-slate-400 mt-0.5">
          Review turnaround time (hours) with 90% CI error bounds and 1.5x anomaly thresholds
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          className="w-full h-auto min-w-[420px] select-none font-sans"
        >
          {/* Subtle horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
            const val = (maxVal * 1.15 * frac);
            const y = yScale(val) + padding.top;
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray={idx === 0 ? 'none' : '2 2'}
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-400 tabular-nums"
                >
                  {val.toFixed(1)}h
                </text>
              </g>
            );
          })}

          {/* Cohort Columns */}
          {cohortsData.map((c, idx) => {
            const xCenter = padding.left + idx * colWidth + colWidth / 2;
            const barWidth = 40;
            const barX = xCenter - barWidth / 2;
            const barY = yScale(c.median) + padding.top;
            const barH = Math.max(2, innerHeight - yScale(c.median));

            const ciY1 = yScale(c.ciUpper) + padding.top;
            const ciY2 = yScale(c.ciLower) + padding.top;
            const threshY = yScale(c.threshold) + padding.top;

            const isHovered = hoveredCohort === c.key;

            return (
              <g 
                key={c.key}
                onMouseEnter={() => setHoveredCohort(c.key)}
                onMouseLeave={() => setHoveredCohort(null)}
                className="cursor-pointer"
              >
                {/* 1.5x Anomaly Threshold */}
                {c.sample > 0 && (
                  <g>
                    <line
                      x1={xCenter - 28}
                      y1={threshY}
                      x2={xCenter + 28}
                      y2={threshY}
                      stroke="#d97706"
                      strokeWidth="1.25"
                      strokeDasharray="3 2"
                    />
                    <text
                      x={xCenter + 30}
                      y={threshY + 3}
                      className="text-[9px] font-mono fill-amber-400 font-medium"
                    >
                      1.5x ({c.threshold.toFixed(1)}h)
                    </text>
                  </g>
                )}

                {/* Main Bar */}
                {c.sample > 0 ? (
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barH}
                    rx="3"
                    fill={isHovered ? '#3b82f6' : '#2563eb'}
                    className="transition-colors duration-150"
                  />
                ) : (
                  <rect
                    x={barX}
                    y={padding.top + innerHeight - 4}
                    width={barWidth}
                    height={4}
                    rx="1"
                    fill="#334155"
                  />
                )}

                {/* 90% CI Error Whisker */}
                {c.sample > 0 && (
                  <g stroke="#93c5fd" strokeWidth="1.5">
                    <line x1={xCenter} y1={ciY1} x2={xCenter} y2={ciY2} />
                    <line x1={xCenter - 5} y1={ciY1} x2={xCenter + 5} y2={ciY1} />
                    <line x1={xCenter - 5} y1={ciY2} x2={xCenter + 5} y2={ciY2} />
                  </g>
                )}

                {/* Median Text */}
                {c.sample > 0 && (
                  <text
                    x={xCenter}
                    y={barY - 5}
                    textAnchor="middle"
                    className="text-[10px] font-mono font-medium fill-slate-200"
                  >
                    {c.median.toFixed(2)}h
                  </text>
                )}

                {/* X Axis Labels */}
                <text
                  x={xCenter}
                  y={chartHeight - 14}
                  textAnchor="middle"
                  className="text-[11px] font-sans font-medium fill-slate-300"
                >
                  {c.key}
                </text>
                <text
                  x={xCenter}
                  y={chartHeight - 3}
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-slate-400"
                >
                  n = {c.sample}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400 font-sans">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block"></span>
            <span>Median (x̃)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-blue-300 inline-block"></span>
            <span>90% CI</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 border-t border-amber-500 border-dashed inline-block"></span>
            <span>1.5x Threshold</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function TurnaroundScatterChart({ anomalies = [], baselineMedians = {}, onSelectAnomaly }) {
  const [selectedPointId, setSelectedPointId] = useState(null);

  // Build real data points from anomalies list and baseline cohorts
  const realPoints = anomalies.map((a, idx) => ({
    id: `anomaly_${a.pr_number || idx}`,
    raw: a,
    prNumber: a.pr_number,
    title: a.title,
    author: a.author,
    size: a.body_length || 34,
    time: a.review_time_hours || 0,
    cohort: a.size_category || 'Small',
    groupMedian: a.group_median_hours || 0,
    ratio: a.anomaly_ratio || 1.5,
    htmlUrl: a.html_url,
    isAnomaly: true
  }));

  // Baseline cohort reference points
  const cohortPoints = Object.entries(baselineMedians).map(([cat, val]) => ({
    id: `median_${cat}`,
    raw: null,
    prNumber: `Cohort ${cat}`,
    title: `${cat} Cohort Median Reference`,
    author: 'baseline',
    size: cat === 'Small' ? 120 : cat === 'Medium' ? 600 : 1500,
    time: val.median_hours,
    cohort: cat,
    groupMedian: val.median_hours,
    ratio: 1.0,
    htmlUrl: null,
    isAnomaly: false
  }));

  const allDisplayPoints = realPoints.length > 0 ? [...cohortPoints, ...realPoints] : cohortPoints;
  const selectedPoint = allDisplayPoints.find(p => p.id === selectedPointId) || null;

  const maxTime = Math.max(...allDisplayPoints.map(p => p.time), 10.0);
  const maxSize = 2500;

  const chartHeight = 200;
  const chartWidth = 520;
  const padding = { top: 20, right: 30, bottom: 35, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const xScale = (size) => (Math.min(size, maxSize) / maxSize) * innerWidth;
  const yScale = (time) => innerHeight - (Math.min(time, maxTime * 1.15) / (maxTime * 1.15)) * innerHeight;

  return (
    <div className="p-4 rounded-lg border border-slate-800 bg-slate-900 flex flex-col justify-between space-y-3 font-sans">
      <div>
        <h4 className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
          <ScatterChart className="w-3.5 h-3.5 text-slate-400" />
          <span>Review Latency vs. PR Complexity</span>
        </h4>
        <p className="text-xs text-slate-400 mt-0.5">
          Observed turnaround time (hours) plotted against PR description length (L_body). Click points to inspect.
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          className="w-full h-auto min-w-[420px] select-none font-sans"
        >
          {/* Y Grid */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
            const val = maxTime * 1.15 * frac;
            const y = yScale(val) + padding.top;
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray={idx === 0 ? 'none' : '2 2'}
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-400 tabular-nums"
                >
                  {val.toFixed(1)}h
                </text>
              </g>
            );
          })}

          {/* Cohort Vertical Guides */}
          <line
            x1={padding.left + xScale(250)}
            y1={padding.top}
            x2={padding.left + xScale(250)}
            y2={padding.top + innerHeight}
            stroke="#1e293b"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <line
            x1={padding.left + xScale(1000)}
            y1={padding.top}
            x2={padding.left + xScale(1000)}
            y2={padding.top + innerHeight}
            stroke="#1e293b"
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* Data Points */}
          {allDisplayPoints.map((p) => {
            const cx = padding.left + xScale(p.size);
            const cy = padding.top + yScale(p.time);
            const isSelected = selectedPointId === p.id;

            if (p.isAnomaly) {
              return (
                <g 
                  key={p.id}
                  onClick={() => setSelectedPointId(isSelected ? null : p.id)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? "8" : "6"}
                    fill="#ef4444"
                    fillOpacity={isSelected ? "1" : "0.85"}
                    stroke={isSelected ? "#fecaca" : "#dc2626"}
                    strokeWidth={isSelected ? "2" : "1.5"}
                  />
                  <text
                    x={cx}
                    y={cy - 10}
                    textAnchor="middle"
                    className="text-[9px] font-mono font-medium fill-rose-300 pointer-events-none"
                  >
                    #{p.prNumber} (+{p.ratio}x)
                  </text>
                </g>
              );
            }

            return (
              <g 
                key={p.id}
                onClick={() => setSelectedPointId(isSelected ? null : p.id)}
                className="cursor-pointer"
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? "6" : "4.5"}
                  fill="#3b82f6"
                  fillOpacity={isSelected ? "1" : "0.75"}
                  stroke={isSelected ? "#93c5fd" : "#2563eb"}
                  strokeWidth={isSelected ? "2" : "1"}
                />
              </g>
            );
          })}

          {/* X Axis Labels */}
          <text x={padding.left + xScale(125)} y={chartHeight - 12} textAnchor="middle" className="text-[10px] font-sans fill-slate-400">
            Small (&lt;250c)
          </text>
          <text x={padding.left + xScale(625)} y={chartHeight - 12} textAnchor="middle" className="text-[10px] font-sans fill-slate-400">
            Medium (250-1000c)
          </text>
          <text x={padding.left + xScale(1750)} y={chartHeight - 12} textAnchor="middle" className="text-[10px] font-sans fill-slate-400">
            Large (&gt;1000c)
          </text>
        </svg>
      </div>

      {/* Point Inspector Popover / Details Bar */}
      {selectedPoint && (
        <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs animate-fade-in">
          <div className="space-y-0.5 max-w-[70%] truncate">
            <div className="flex items-center space-x-2">
              <span className={`font-mono font-medium ${selectedPoint.isAnomaly ? 'text-rose-400' : 'text-blue-400'}`}>
                {selectedPoint.isAnomaly ? `PR #${selectedPoint.prNumber}` : selectedPoint.title}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                {selectedPoint.cohort} Cohort
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              {selectedPoint.title || 'Pull Request inspection'}
            </p>
            <div className="text-[10px] text-slate-400 font-mono">
              Turnaround: <strong className="text-slate-200">{selectedPoint.time.toFixed(2)}h</strong> • Cohort Median: {selectedPoint.groupMedian.toFixed(2)}h {selectedPoint.isAnomaly && `(+${selectedPoint.ratio}x)`}
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {selectedPoint.isAnomaly && selectedPoint.raw && onSelectAnomaly && (
              <button
                onClick={() => onSelectAnomaly(selectedPoint.raw)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                Inspect Dossier
              </button>
            )}
            {selectedPoint.htmlUrl && (
              <a
                href={selectedPoint.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 text-[11px] rounded font-medium border border-blue-500/30 transition-colors"
              >
                GitHub ↗
              </a>
            )}
            <button
              onClick={() => setSelectedPointId(null)}
              className="p-1 text-slate-500 hover:text-slate-300 text-[10px] font-mono"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400 font-sans">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
            <span>Cohort Baseline Reference</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span>Flagged Anomaly (&gt;1.5x)</span>
          </span>
        </div>
      </div>
    </div>
  );
}

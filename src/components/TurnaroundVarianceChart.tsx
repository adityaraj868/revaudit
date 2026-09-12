import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ErrorBar
} from 'recharts';
import { RepositoryAuditSummary } from '../types';
import { getAnomalyBadgeStyles } from '../lib/statisticalEngine';
import { AlertCircle, Filter } from 'lucide-react';

interface TurnaroundVarianceChartProps {
  repositories: RepositoryAuditSummary[];
  onSelectRepo?: (repo: string) => void;
}

export const TurnaroundVarianceChart: React.FC<TurnaroundVarianceChartProps> = ({
  repositories,
  onSelectRepo
}) => {
  const [showErrorBars, setShowErrorBars] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<'latency' | 'z_score' | 'name'>('latency');

  const sortedData = [...repositories].sort((a, b) => {
    if (sortBy === 'latency') return b.observed_mean_latency_hrs - a.observed_mean_latency_hrs;
    if (sortBy === 'z_score') return b.z_score - a.z_score;
    return a.repo.localeCompare(b.repo);
  });

  const chartData = sortedData.map(r => ({
    name: r.repo.split('/')[1] || r.repo,
    fullName: r.repo,
    category: r.category,
    observed: r.observed_mean_latency_hrs,
    expected: r.expected_latency_hrs,
    ciLower: r.expected_ci_95[0],
    ciUpper: r.expected_ci_95[1],
    errorRange: [r.expected_latency_hrs - r.expected_ci_95[0], r.expected_ci_95[1] - r.expected_latency_hrs],
    zScore: r.z_score,
    status: r.status,
    sampleSize: r.sample_size,
    shiftInjected: r.controlled_shift_injected
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const badge = getAnomalyBadgeStyles(data.status);
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-xl shadow-2xl text-xs space-y-2 max-w-xs backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <p className="font-bold text-white text-sm font-mono">{data.fullName}</p>
              <p className="text-slate-400">{data.category}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] border ${badge.bg}`}>
              {data.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
            <div>
              <span className="text-slate-400 block">Observed Latency:</span>
              <span className="font-bold text-amber-400 font-mono">{data.observed.toFixed(1)} hrs</span>
            </div>
            <div>
              <span className="text-slate-400 block">Model Expected:</span>
              <span className="font-bold text-teal-400 font-mono">{data.expected.toFixed(1)} hrs</span>
            </div>
            <div>
              <span className="text-slate-400 block">95% Conf. Interval:</span>
              <span className="font-mono text-slate-200">[{data.ciLower.toFixed(1)}h, {data.ciUpper.toFixed(1)}h]</span>
            </div>
            <div>
              <span className="text-slate-400 block">Standardized Z:</span>
              <span className={`font-mono font-bold ${Math.abs(data.zScore) > 2 ? 'text-rose-400' : 'text-teal-300'}`}>
                {data.zScore > 0 ? `+${data.zScore.toFixed(2)}` : data.zScore.toFixed(2)}
              </span>
            </div>
          </div>

          {data.shiftInjected && (
            <div className="pt-2 border-t border-slate-800 text-[11px] text-rose-300 flex items-center space-x-1">
              <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span>Synthetic +24h bottleneck shift injected &amp; recovered.</span>
            </div>
          )}

          <div className="text-[10px] text-slate-400 pt-1">
            Audited sample: <span className="text-white font-mono">{data.sampleSize} PRs</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-white">Turnaround Variance Plot</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-slate-800 text-teal-300 border border-slate-700 rounded-md font-mono">
              Observed vs Model-Adjusted Expected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Statistical comparison across all 15 repositories after strictly adjusting for patch churn, files, subsystem, author experience, and reviewer concurrent workload.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <label className="flex items-center space-x-2 cursor-pointer bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
            <input
              type="checkbox"
              checked={showErrorBars}
              onChange={(e) => setShowErrorBars(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-teal-500"
            />
            <span>Show 95% Error Bars</span>
          </label>

          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-teal-300 font-medium focus:outline-none font-mono"
            >
              <option value="latency" className="bg-slate-900">Observed Latency</option>
              <option value="z_score" className="bg-slate-900">Z-Score (Residual)</option>
              <option value="name" className="bg-slate-900">Repository Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 40 }}
            barCategoryGap={12}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              height={50}
              fontFamily="monospace"
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              unit="h"
              label={{
                value: 'Time to First Human Review (Hours)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
            />
            
            {/* Model Expected Baseline Bar */}
            <Bar
              dataKey="expected"
              name="3-Level Model Expected Baseline"
              fill="#0d9488"
              radius={[4, 4, 0, 0]}
              opacity={0.85}
            >
              {showErrorBars && (
                <ErrorBar
                  dataKey="errorRange"
                  width={4}
                  strokeWidth={2}
                  stroke="#5eead4"
                />
              )}
            </Bar>

            {/* Observed Latency Bar */}
            <Bar
              dataKey="observed"
              name="Empirical Observed Latency"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => {
                let color = '#38bdf8'; // Normal in-control
                if (entry.status === 'DELAY_BOTTLENECK') color = '#f43f5e'; // Delayed bottleneck
                if (entry.status === 'EXPEDITED_QUEUE') color = '#10b981'; // Fast expedited
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend and Process Safeguard Note */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-sm bg-[#0d9488]"></span>
            <span>Model Expected Baseline (95% CI)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-sm bg-[#38bdf8]"></span>
            <span>In Statistical Control (|Z| ≤ 1.96)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-sm bg-[#f43f5e]"></span>
            <span>Bottleneck Process Shift (|Z| &gt; 2.0)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Model: 3-Level Mixed Effects Latency = γ000 + β(X) + v00k + u0jk + eijk
        </div>
      </div>
    </div>
  );
};

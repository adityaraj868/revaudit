import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area
} from 'recharts';
import { AnnotatedPRItem } from '../types/audit';
import { BarChart3, TrendingUp, Filter } from 'lucide-react';

interface RepoObservedVsExpectedChartProps {
  prs: AnnotatedPRItem[];
  repoName: string;
}

export const RepoObservedVsExpectedChart: React.FC<RepoObservedVsExpectedChartProps> = ({
  prs,
  repoName
}) => {
  // Sort PRs by expected latency to generate a clean baseline curve
  const sortedPrs = [...prs].sort((a, b) => a.expected_latency_hrs - b.expected_latency_hrs);

  const chartData = sortedPrs.map((p, index) => ({
    index: index + 1,
    pr_id: p.pr_id,
    title: p.title,
    observed: p.observed_latency_hrs,
    expected: p.expected_latency_hrs,
    residual: p.residual_hrs,
    workload: p.workload,
    churn: p.lines_added + p.lines_deleted,
    verdict: p.audit_verdict,
    badge: p.verdict_badge
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-teal-400 font-mono">{data.pr_id.split('_').slice(-2).join('_')}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${
              data.badge === 'delayed'
                ? 'bg-rose-500/20 text-rose-300'
                : data.badge === 'fast_tracked'
                ? 'bg-purple-500/20 text-purple-300'
                : 'bg-teal-500/20 text-teal-300'
            }`}>
              {data.verdict}
            </span>
          </div>
          <p className="text-slate-300 truncate max-w-xs font-sans">{data.title}</p>
          <div className="text-slate-400 space-y-0.5 font-mono text-[11px]">
            <p>Observed Time: <span className="font-bold text-amber-400">{data.observed}h</span></p>
            <p>Repo Expected: <span className="font-bold text-teal-300">{data.expected}h</span></p>
            <p>Deviation: <span className={data.residual > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {data.residual > 0 ? `+${data.residual.toFixed(1)}h` : `${data.residual.toFixed(1)}h`}
            </span></p>
            <p>Reviewer Load: {data.workload} open PRs • Churn: {data.churn} lines</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2 font-mono">
              <BarChart3 className="h-5 w-5 text-teal-400" />
              <span>Observed vs. Repo-Normal Expected Distribution</span>
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold bg-slate-800 text-teal-300 border border-slate-700 rounded-md font-mono">
              {repoName}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Comparing individual pull request turnaround latencies against this repository&apos;s internal baseline model.
          </p>
        </div>
      </div>

      <div className="w-full pt-2" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="index" stroke="#64748b" fontSize={11} name="PR Rank (by Expected Size)" unit="" tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} unit="h" label={{ value: 'Review Latency (Hours)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 } }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px' }} />

            {/* Repo Normal Baseline Curve */}
            <Line
              type="monotone"
              dataKey="expected"
              name="Repo-Normal Expected Baseline"
              stroke="#0d9488"
              strokeWidth={3}
              dot={false}
            />

            {/* Observed Data Points */}
            <Scatter
              dataKey="observed"
              name="Observed PR Latency"
              fill="#38bdf8"
              opacity={0.65}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 font-mono">
        <span>Fitted exclusively on {repoName} pull requests (Residual Std = ±3.2h).</span>
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="h-2 w-2 rounded-full bg-teal-500"></span>
            <span>Repo Baseline</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="h-2 w-2 rounded-full bg-sky-400"></span>
            <span>PR Observations</span>
          </span>
        </div>
      </div>
    </div>
  );
};

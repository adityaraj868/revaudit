import React from 'react';
import { BaselineComparison } from '../types';
import { Layers, CheckCircle2, XCircle, Award, BarChart2, TrendingDown, BookOpen } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface ResearchBaselinesBenchmarkProps {
  baselineComparisons: BaselineComparison[];
}

export const ResearchBaselinesBenchmark: React.FC<ResearchBaselinesBenchmarkProps> = ({
  baselineComparisons
}) => {
  const chartData = baselineComparisons.map(b => ({
    name: b.id === 'model_3level' ? 'RevAudit (3-Level)' : b.id.replace('_', ' ').toUpperCase(),
    fullName: b.name,
    RMSE: b.rmse,
    MAE: b.mae,
    AIC: b.aic,
    isPrimary: b.is_primary
  }));

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-bold text-white">Research Baselines Benchmarking</h3>
          <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md font-mono">
            Model Validation vs Literature
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          RevAudit empirical 3-level mixed-effects model systematically benchmarked against 3 standard literature baselines: Pooled OLS (B1), Raw Unadjusted Rolling Metrics (B2), and Patch Effort Models (B3).
        </p>
      </div>

      {/* Model Comparison Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 font-mono uppercase text-[11px]">
            <tr>
              <th className="py-3 px-4">Model Specification</th>
              <th className="py-3 px-3">Architecture Type</th>
              <th className="py-3 px-3 text-center">Workload Control</th>
              <th className="py-3 px-3 text-center">Hierarchy Control</th>
              <th className="py-3 px-3 text-right">RMSE (h)</th>
              <th className="py-3 px-3 text-right">MAE (h)</th>
              <th className="py-3 px-3 text-right">AIC / ΔAIC</th>
              <th className="py-3 px-4 text-center">Rank</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono">
            {baselineComparisons.map((b) => (
              <tr
                key={b.id}
                className={b.is_primary ? 'bg-teal-950/20 font-medium' : 'hover:bg-slate-800/30'}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2 font-sans">
                    {b.is_primary && (
                      <span className="p-1 bg-teal-500/20 text-teal-400 rounded">
                        <Award className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div>
                      <p className="font-bold text-white text-xs">{b.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{b.id}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-slate-400 font-sans text-[11px] max-w-xs">{b.type}</td>
                <td className="py-3 px-3 text-center">
                  {b.controls_workload ? (
                    <span className="inline-flex items-center text-emerald-400"><CheckCircle2 className="h-4 w-4" /></span>
                  ) : (
                    <span className="inline-flex items-center text-slate-600"><XCircle className="h-4 w-4" /></span>
                  )}
                </td>
                <td className="py-3 px-3 text-center">
                  {b.controls_hierarchy ? (
                    <span className="inline-flex items-center text-emerald-400"><CheckCircle2 className="h-4 w-4" /></span>
                  ) : (
                    <span className="inline-flex items-center text-slate-600"><XCircle className="h-4 w-4" /></span>
                  )}
                </td>
                <td className="py-3 px-3 text-right font-bold text-amber-400">{b.rmse.toFixed(2)}h</td>
                <td className="py-3 px-3 text-right text-slate-300">{b.mae.toFixed(2)}h</td>
                <td className="py-3 px-3 text-right">
                  <span className="text-teal-300 font-bold">{b.aic.toLocaleString()}</span>
                  {b.delta_aic > 0 && (
                    <span className="text-rose-400 text-[10px] block font-sans">+{b.delta_aic.toFixed(0)} ΔAIC</span>
                  )}
                  {b.delta_aic === 0 && (
                    <span className="text-teal-400 text-[10px] block font-sans">Best Fit (Δ=0)</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {b.is_primary ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold">
                      Optimal
                    </span>
                  ) : (
                    <span className="text-slate-500 font-sans text-[11px]">Sub-optimal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Error Comparison Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="bg-slate-850 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-300 font-semibold mb-3">
            <BarChart2 className="h-4 w-4 text-teal-400" />
            <span>Root Mean Squared Error (RMSE - Lower is Better)</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" height={40} />
                <YAxis stroke="#64748b" fontSize={10} unit="h" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="RMSE" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-850 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-300 font-semibold mb-3">
            <TrendingDown className="h-4 w-4 text-indigo-400" />
            <span>Akaike Information Criterion (AIC - Lower is Better)</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" height={40} />
                <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="AIC" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

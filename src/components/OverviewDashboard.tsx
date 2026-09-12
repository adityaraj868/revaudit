import React from 'react';
import { StatisticalModelPayload } from '../types';
import { ExecutiveKPIRow } from './ExecutiveKPIRow';
import { TurnaroundVarianceChart } from './TurnaroundVarianceChart';
import { WorkloadCorrelationChart } from './WorkloadCorrelationChart';
import { RepositoryAuditTable } from './RepositoryAuditTable';
import { SubsystemAnalysis } from './SubsystemAnalysis';
import { HypothesesValidationMatrix } from './HypothesesValidationMatrix';
import { ResearchBaselinesBenchmark } from './ResearchBaselinesBenchmark';
import { SyntheticShiftBenchmark } from './SyntheticShiftBenchmark';
import { ShieldCheck, Info, CheckCircle2 } from 'lucide-react';

interface OverviewDashboardProps {
  modelData: StatisticalModelPayload;
  selectedRepo: string;
  setSelectedRepo: (repo: string) => void;
  onOpenEthicalModal: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  modelData,
  selectedRepo,
  setSelectedRepo,
  onOpenEthicalModal
}) => {
  const filteredRepos = selectedRepo === 'ALL'
    ? modelData.repositories
    : modelData.repositories.filter(r => r.repo === selectedRepo);

  return (
    <div className="space-y-6">
      {/* Executive Process KPI Row */}
      <ExecutiveKPIRow
        metadata={modelData.metadata}
        params={modelData.fitted_parameters}
        totalRepos={modelData.repositories.length}
      />

      {/* Main Dual Bar Chart: Turnaround Variance */}
      <TurnaroundVarianceChart
        repositories={filteredRepos}
        onSelectRepo={(r) => setSelectedRepo(r)}
      />

      {/* Repository Process Audit Matrix */}
      <RepositoryAuditTable
        repositories={filteredRepos}
        onSelectRepo={(r) => setSelectedRepo(r)}
      />

      {/* H1 Workload vs Latency Correlation & Subsystem Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WorkloadCorrelationChart
            correlationSample={modelData.workload_correlation_sample}
            regressionTrend={modelData.regression_trend}
            hypothesisH1={modelData.hypotheses.find(h => h.id === 'H1')}
          />
        </div>
        <div className="lg:col-span-1">
          <SubsystemAnalysis subsystems={modelData.subsystem_breakdown} />
        </div>
      </div>

      {/* Scientific Hypotheses & Benchmarking */}
      <HypothesesValidationMatrix hypotheses={modelData.hypotheses} />

      {/* Research Baselines (B1, B2, B3) */}
      <ResearchBaselinesBenchmark baselineComparisons={modelData.baseline_comparisons} />

      {/* Synthetic Ground-Truth Shift Benchmark */}
      <SyntheticShiftBenchmark
        shiftValidation={modelData.synthetic_shift_validation}
        repositories={modelData.repositories}
      />
    </div>
  );
};

export type SubsystemType = 'core' | 'api' | 'docs' | 'tests' | 'ui';

export type AnomalyStatusCode = 'DELAY_BOTTLENECK' | 'EXPEDITED_FLOW' | 'IN_CONTROL';

export interface RepositoryAuditRecord {
  repo_name: string;
  category: string;
  sample_size: number;
  observed_latency_hours: number;
  observed_median_hours: number;
  expected_latency_hours: number;
  residual_hours: number;
  confidence_interval_95: [number, number];
  standard_error: number;
  z_score: number;
  p_value: number;
  status: string;
  status_code: AnomalyStatusCode;
  badge_type: 'anomaly' | 'expedited' | 'normal';
  is_anomaly: boolean;
  synthetic_shift_injected: boolean;
  avg_reviewer_workload: number;
  avg_lines_added: number;
  first_time_contributor_pct: number;
}

export interface ModelCoefficients {
  intercept_beta_0: number;
  lines_added_beta_1: number;
  workload_beta_2: number;
  first_time_beta_3: number;
  r_squared: number;
  f_pvalue: number;
}

export interface AuditMetadata {
  total_repositories: number;
  total_prs_ingested: number;
  total_human_prs_analyzed: number;
  total_bot_prs_excluded: number;
  bot_filtering_rate_pct: number;
  model_type: string;
  model_coefficients: ModelCoefficients;
}

export interface AuditApiResponse {
  metadata: AuditMetadata;
  repositories: RepositoryAuditRecord[];
}

export interface WorkloadCorrelationPoint {
  pr_id: string;
  repo_name: string;
  reviewer_concurrent_workload: number;
  time_to_first_review_hours: number;
  lines_added: number;
  subsystem: SubsystemType;
  is_first_time: boolean;
}

export interface TrendCurvePoint {
  reviewer_concurrent_workload: number;
  fitted_latency_hours: number;
  ci_lower: number;
  ci_upper: number;
}

export interface WorkloadCorrelationResponse {
  sample_points: WorkloadCorrelationPoint[];
  trend_curve: TrendCurvePoint[];
  h1_effect_size: number;
  h1_p_value: number;
}

export interface PullRequestEntity {
  pr_id: string;
  repo_name: string;
  category: string;
  title: string;
  author_id: string;
  is_first_time_contributor: boolean;
  created_at: string;
  closed_at: string;
  merged_at: string | null;
  lines_added: number;
  lines_deleted: number;
  files_changed: number;
  subsystem: SubsystemType;
  reviewer_concurrent_workload: number;
  time_to_first_review_hours: number;
  total_review_rounds: number;
  inline_comment_count: number;
  issue_comment_count: number;
  was_changes_requested: boolean;
  is_merged: boolean;
  is_bot: boolean;
  synthetic_shift_injected: boolean;
}

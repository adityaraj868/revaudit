export type SubsystemType = 'core' | 'api' | 'docs' | 'tests' | 'ui';

export type AnomalyStatus = 'DELAY_BOTTLENECK' | 'EXPEDITED_QUEUE' | 'IN_CONTROL';

export interface PullRequestReviewEntity {
  id: string;
  pr_id: string;
  reviewer: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  submitted_at: string;
  is_bot: boolean;
  latency_from_pr_creation_hrs: number;
}

export interface ReviewCommentEntity {
  id: string;
  pr_id: string;
  author: string;
  path: string;
  line: number;
  body: string;
  created_at: string;
  is_bot: boolean;
}

export interface IssueCommentEntity {
  id: string;
  pr_id: string;
  author: string;
  body: string;
  created_at: string;
  is_bot: boolean;
}

export interface PullRequestRecord {
  id: string;
  number: number;
  repo: string;
  category: string;
  title: string;
  author: string;
  author_association: string;
  is_first_time_contributor: boolean;
  subsystem: SubsystemType;
  lines_added: number;
  lines_deleted: number;
  churn: number;
  files_changed: number;
  reviewer_concurrent_workload: number;
  time_to_first_review_hrs: number;
  total_review_rounds: number;
  inline_comment_count: number;
  issue_comment_count: number;
  was_changes_requested: boolean;
  is_merged: boolean;
  assigned_reviewer: string;
  created_at: string;
  closed_at: string;
  controlled_shift_injected: boolean;
  is_bot_filtered: boolean;
  review_count: number;
  review_comment_count: number;
  issue_comment_count_total: number;
  reviews?: PullRequestReviewEntity[];
  review_comments?: ReviewCommentEntity[];
  issue_comments?: IssueCommentEntity[];
}

export interface RepositoryAuditSummary {
  repo: string;
  category: string;
  sample_size: number;
  observed_mean_latency_hrs: number;
  observed_median_latency_hrs: number;
  observed_ci_95: [number, number];
  expected_latency_hrs: number;
  expected_ci_95: [number, number];
  standard_error: number;
  z_score: number;
  p_value: number;
  status: AnomalyStatus;
  badge_color: 'red' | 'emerald' | 'teal';
  process_finding: string;
  controlled_shift_injected: boolean;
  avg_reviewer_workload: number;
  avg_lines_churn: number;
  first_time_contributor_pct: number;
  ci_runtime_min: number;
}

export interface FittedParameters {
  gamma_000_intercept: number;
  beta_churn_lines: number;
  beta_workload_concurrent_prs: number;
  beta_experience_first_time: number;
  beta_files_changed: number;
  sigma2_repository_level3: number;
  sigma2_reviewer_level2: number;
  sigma2_residual_level1: number;
  icc_repository: number;
  icc_reviewer: number;
}

export interface BaselineComparison {
  id: string;
  name: string;
  type: string;
  description: string;
  rmse: number;
  mae: number;
  r_squared: number;
  aic: number;
  bic: number;
  delta_aic: number;
  controls_workload: boolean;
  controls_churn: boolean;
  controls_hierarchy: boolean;
  is_primary: boolean;
}

export interface HypothesisResult {
  id: string;
  title: string;
  hypothesis: string;
  confirmed: boolean;
  effect_size: string;
  test_statistic: string;
  p_value: string;
  ci_95: string;
  interpretation: string;
}

export interface WorkloadCorrelationPoint {
  id: string;
  repo: string;
  reviewer_workload: number;
  latency_hrs: number;
  lines_added: number;
  files_changed: number;
  subsystem: SubsystemType;
  is_first_time: boolean;
}

export interface RegressionTrendPoint {
  reviewer_workload: number;
  expected_latency_hrs: number;
  ci_lower: number;
  ci_upper: number;
}

export interface SubsystemBreakdown {
  subsystem: SubsystemType;
  count: number;
  mean_latency_hrs: number;
  median_latency_hrs: number;
  modifier: number;
}

export interface SyntheticShiftValidation {
  shifted_repositories: string[];
  injected_shift_hours: number;
  detected_numpy_z_score: number;
  detected_django_z_score: number;
  false_positive_count: number;
  recovery_status: string;
}

export interface IngestionMetadata {
  total_raw_prs_ingested: number;
  total_human_prs_analyzed: number;
  total_bot_prs_filtered: number;
  total_bot_reviews_filtered: number;
  total_bot_comments_filtered: number;
  bot_filtering_rate_pct: number;
  ingestion_timestamp: string;
}

export interface StatisticalModelPayload {
  metadata: IngestionMetadata;
  model_type: string;
  fitted_parameters: FittedParameters;
  repositories: RepositoryAuditSummary[];
  baseline_comparisons: BaselineComparison[];
  hypotheses: HypothesisResult[];
  workload_correlation_sample: WorkloadCorrelationPoint[];
  regression_trend: RegressionTrendPoint[];
  subsystem_breakdown: SubsystemBreakdown[];
  synthetic_shift_validation: SyntheticShiftValidation;
}

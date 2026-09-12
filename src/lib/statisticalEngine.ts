import { FittedParameters, PullRequestRecord, RepositoryAuditSummary, SubsystemType } from '../types';

export const BOT_USER_PATTERNS = [
  'bot',
  'dependabot',
  'renovate',
  'github-actions',
  'codecov',
  'greenkeeper',
  'stale',
  'semantic-release-bot',
  'snyk-bot',
  'imgbot'
];

/**
 * Checks whether an author or reviewer is an automated bot.
 */
export function isBotAccount(username: string): boolean {
  const u = username.toLowerCase();
  return BOT_USER_PATTERNS.some(pattern => u.includes(pattern));
}

/**
 * Calculates the expected review latency (Hours) from the fitted 3-Level Mixed-Effects Model
 * adjusting for churn, workload, author experience, files changed, and subsystem.
 */
export function computeExpectedLatency(
  pr: Partial<PullRequestRecord>,
  params: FittedParameters,
  repoBaseLatency: number = 20.0
): number {
  const churn = (pr.lines_added || 0) + (pr.lines_deleted || 0);
  const workload = pr.reviewer_concurrent_workload || 1;
  const isFirstTime = pr.is_first_time_contributor ? 1 : 0;
  const files = pr.files_changed || 1;

  const expected = 
    repoBaseLatency +
    params.beta_churn_lines * (churn / 10.0) +
    params.beta_workload_concurrent_prs * workload +
    params.beta_experience_first_time * isFirstTime +
    params.beta_files_changed * files;

  return Math.max(0.5, Math.round(expected * 100) / 100);
}

/**
 * Calculates 95% Confidence Interval: [mu - 1.96 * SE, mu + 1.96 * SE]
 */
export function computeConfidenceInterval95(
  meanValue: number,
  standardError: number
): [number, number] {
  const lower = Math.max(0.1, meanValue - 1.96 * standardError);
  const upper = meanValue + 1.96 * standardError;
  return [Math.round(lower * 100) / 100, Math.round(upper * 100) / 100];
}

/**
 * Calculates the standardized residual Z-Score: (Observed - Expected) / SE
 */
export function computeStandardizedResidual(
  observed: number,
  expected: number,
  standardError: number
): number {
  if (standardError <= 0) return 0;
  const z = (observed - expected) / standardError;
  return Math.round(z * 1000) / 1000;
}

/**
 * Formats a latency number in hours to a human-readable string (e.g. "14.5 hrs" or "1.2 days").
 */
export function formatLatency(hrs: number): string {
  if (hrs >= 48) {
    const days = (hrs / 24).toFixed(1);
    return `${hrs.toFixed(1)}h (${days}d)`;
  }
  return `${hrs.toFixed(1)}h`;
}

/**
 * Formats a 95% Confidence Interval for UI display: "[12.4h, 16.8h]"
 */
export function formatCI(ci: [number, number]): string {
  return `[${ci[0].toFixed(1)}h, ${ci[1].toFixed(1)}h]`;
}

/**
 * Returns color classes for anomaly status badges adhering to ethical safeguards.
 */
export function getAnomalyBadgeStyles(status: RepositoryAuditSummary['status']) {
  switch (status) {
    case 'DELAY_BOTTLENECK':
      return {
        bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
        dot: 'bg-rose-500',
        label: 'Bottleneck Delay (|Z| > 2.0)',
        iconColor: 'text-rose-400'
      };
    case 'EXPEDITED_QUEUE':
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        dot: 'bg-emerald-500',
        label: 'Expedited Flow (|Z| > 2.0)',
        iconColor: 'text-emerald-400'
      };
    case 'IN_CONTROL':
    default:
      return {
        bg: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
        dot: 'bg-teal-500',
        label: 'In Control (|Z| ≤ 1.96)',
        iconColor: 'text-teal-400'
      };
  }
}

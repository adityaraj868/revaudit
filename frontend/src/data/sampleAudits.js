export const SAMPLE_REPOSITORIES = [
  { slug: 'fastapi/fastapi', name: 'fastapi/fastapi', desc: 'FastAPI framework (Python)', default: true },
  { slug: 'pallets/flask', name: 'pallets/flask', desc: 'Flask web framework (Python)' },
  { slug: 'psf/requests', name: 'psf/requests', desc: 'Python HTTP requests library' },
  { slug: 'django/django', name: 'django/django', desc: 'Django web framework (Python)' },
  { slug: 'facebook/react', name: 'facebook/react', desc: 'React JavaScript library' },
  { slug: 'numpy/numpy', name: 'numpy/numpy', desc: 'NumPy scientific computing' }
];

export const FALLBACK_AUDIT_DATA = {
  'fastapi/fastapi': {
    owner: 'fastapi',
    repo: 'fastapi',
    total_closed_prs: 30,
    merged_prs_count: 9,
    unmerged_prs_dropped: 21,
    baseline_medians: {
      Small: {
        median_hours: 0.39,
        sample_size: 3,
        mock_ci_90: [0.00, 2.15]
      },
      Large: {
        median_hours: 8.04,
        sample_size: 6,
        mock_ci_90: [7.56, 8.51]
      }
    },
    anomalies_count: 1,
    anomalies: [
      {
        pr_number: 16282,
        title: '👥 Update FastAPI People - Sponsors',
        author: 'pr-submit[bot]',
        size_category: 'Small',
        body_length: 34,
        review_time_hours: 3.55,
        group_median_hours: 0.39,
        anomaly_ratio: 9.10,
        threshold_hours: 0.58,
        mock_ci_90: [0.00, 2.15],
        html_url: 'https://github.com/fastapi/fastapi/pull/16282',
        created_at: '2026-09-12T14:20:00Z',
        merged_at: '2026-09-12T17:53:00Z'
      }
    ]
  },
  'pallets/flask': {
    owner: 'pallets',
    repo: 'flask',
    total_closed_prs: 30,
    merged_prs_count: 14,
    unmerged_prs_dropped: 16,
    baseline_medians: {
      Small: {
        median_hours: 1.25,
        sample_size: 5,
        mock_ci_90: [0.65, 1.85]
      },
      Medium: {
        median_hours: 4.80,
        sample_size: 6,
        mock_ci_90: [3.40, 6.20]
      },
      Large: {
        median_hours: 14.50,
        sample_size: 3,
        mock_ci_90: [10.20, 18.80]
      }
    },
    anomalies_count: 2,
    anomalies: [
      {
        pr_number: 5412,
        title: 'Fix blueprint route registration order in nested apps',
        author: 'contributor-dev',
        size_category: 'Small',
        body_length: 180,
        review_time_hours: 6.40,
        group_median_hours: 1.25,
        anomaly_ratio: 5.12,
        threshold_hours: 1.88,
        mock_ci_90: [0.65, 1.85],
        html_url: 'https://github.com/pallets/flask/pull/5412',
        created_at: '2026-09-10T09:15:00Z',
        merged_at: '2026-09-10T15:39:00Z'
      },
      {
        pr_number: 5399,
        title: 'Refactor async context teardown callbacks for ASGI',
        author: 'core-maintainer',
        size_category: 'Medium',
        body_length: 620,
        review_time_hours: 11.20,
        group_median_hours: 4.80,
        anomaly_ratio: 2.33,
        threshold_hours: 7.20,
        mock_ci_90: [3.40, 6.20],
        html_url: 'https://github.com/pallets/flask/pull/5399',
        created_at: '2026-09-08T11:00:00Z',
        merged_at: '2026-09-08T22:12:00Z'
      }
    ]
  },
  'psf/requests': {
    owner: 'psf',
    repo: 'requests',
    total_closed_prs: 30,
    merged_prs_count: 11,
    unmerged_prs_dropped: 19,
    baseline_medians: {
      Small: {
        median_hours: 2.10,
        sample_size: 4,
        mock_ci_90: [1.20, 3.00]
      },
      Medium: {
        median_hours: 6.50,
        sample_size: 5,
        mock_ci_90: [4.80, 8.20]
      },
      Large: {
        median_hours: 22.00,
        sample_size: 2,
        mock_ci_90: [18.00, 26.00]
      }
    },
    anomalies_count: 1,
    anomalies: [
      {
        pr_number: 6710,
        title: 'Improve error handling on chunked transfer timeouts',
        author: 'network-eng',
        size_category: 'Small',
        body_length: 210,
        review_time_hours: 8.90,
        group_median_hours: 2.10,
        anomaly_ratio: 4.24,
        threshold_hours: 3.15,
        mock_ci_90: [1.20, 3.00],
        html_url: 'https://github.com/psf/requests/pull/6710',
        created_at: '2026-09-05T14:30:00Z',
        merged_at: '2026-09-05T23:24:00Z'
      }
    ]
  }
};

export const PRESENTATION_SLIDES = [
  {
    id: '01_title',
    num: '01',
    category: 'Introduction',
    title: 'RevAudit: Empirical Code Review Analytics',
    subtitle: 'Controlling for Pull Request Size and Reviewer Workload to Measure True Review Effort Consistency',
    metadata: {
      team: 'Team ArchCoders',
      course: 'UCS503 Software Engineering Laboratory',
      members: ['Sparsh Khandelwal (Backend/Math)', 'Dheeraj (Architecture/UML)', 'Adityaraj Singh (Frontend/UI)', 'Vaibhav Goyal (QA/Testing)']
    },
    keyPoints: [
      {
        title: 'Core Engineering Problem',
        text: 'Raw turnaround times (e.g. arithmetic mean time-to-merge) fail to evaluate engineering velocity because pull request complexity and reviewer concurrency vary by orders of magnitude.'
      },
      {
        title: 'Empirical Solution',
        text: 'A statistical anomaly engine built on FastAPI & Pandas that ingests live GitHub REST API v3 pull requests, stratifies by size proxy, and measures deviation from non-parametric medians.'
      },
      {
        title: 'Prototype Integrity',
        text: 'Live operational analytics engine with zero fabricated data: direct API querying, survival bias filtering, 90% confidence intervals, and 1.5x anomaly threshold detection.'
      }
    ],
    speakerNotes: "Welcome. Today Team ArchCoders presents RevAudit. In modern software engineering, 'time-to-merge' is often used as a metric for team velocity. However, this metric is fundamentally broken because it treats all pull requests equally. RevAudit normalizes PR turnaround times using statistical baselines and flags true review anomalies without blaming individual contributors.",
    diagramId: null
  },
  {
    id: '02_problem',
    num: '02',
    category: 'The Problem',
    title: 'The Flaw in Raw Turnaround Metrics & Invisible Variation',
    subtitle: 'Why flat averages fail software engineering teams and create perverse reviewer incentives',
    keyPoints: [
      {
        title: 'Uncontrolled Confounders',
        text: 'A 10-line documentation typo fix taking 48 hours indicates severe queue stagnation or review friction. Conversely, a 2,500-line architectural subsystem refactor taking 48 hours is blazing fast. Flat arithmetic averages treat them identically.'
      },
      {
        title: 'Perverse "LGTM" Incentives',
        text: 'Evaluating engineering teams on unadjusted turnaround time actively rewards rubber-stamping trivial PRs with immediate approvals while penalizing engineers who conduct thorough, rigorous reviews on complex, critical pull requests.'
      },
      {
        title: 'Reviewer Queueing & Workload Bias',
        text: 'Senior maintainers juggling high concurrent review loads experience substantial queue latency delays that get mistakenly attributed to individual PR inertia rather than system-wide review saturation.'
      }
    ],
    statisticalTakeaway: 'Code review latency in empirical software engineering follows heavy-tailed, right-skewed distributions (log-normal/Pareto). Parametric arithmetic averages (μ) are distorted by outliers, making non-parametric cohort medians mandatory.',
    speakerNotes: "When engineering leadership inspects average turnaround times, they suffer from invisible variation. Confounders like PR complexity and reviewer fatigue hide within the numbers. An engineer conducting a 2-day thorough review on a multi-file architectural change is penalized, while someone typing 'LGTM' in 5 minutes on a typo is rewarded. We need statistical normalization.",
    diagramId: '04_sequence_pandas_baseline'
  },
  {
    id: '03_solution',
    num: '03',
    category: 'Methodology',
    title: 'Size-Controlled Medians & 1.5x Anomaly Multiplier Pipeline',
    subtitle: 'The five-stage data cleaning, stratification, and non-parametric anomaly pipeline',
    stages: [
      {
        step: '1. Ingestion & Survival Imputation',
        desc: 'Ingests closed PRs via GitHub REST API v3 and discards unmerged/abandoned branches (merged_at != null) to eliminate survivor bias from rejected experiments.'
      },
      {
        step: '2. Complexity Stratification',
        desc: 'Partitions PRs by description character length: Small (<250 chars), Medium (250–1000 chars), and Large (>1000 chars) cohorts.'
      },
      {
        step: '3. Non-Parametric Median (x̃)',
        desc: 'Calculates the 50th percentile breakdown-point median for each size cohort, ensuring extreme outliers cannot skew the baseline.'
      },
      {
        step: '4. 90% Confidence Interval',
        desc: 'Computes sampling uncertainty bounds: CI_90 = x̃ ± 1.645 * (s / sqrt(n)) to provide statistically credible margins.'
      },
      {
        step: '5. 1.5x Anomaly Multiplier',
        desc: 'Flags any PR whose review duration exceeds 1.5x the cohort median (Δt > 1.5 * x̃_C) with computed variance ratio R_i.'
      }
    ],
    speakerNotes: "Rather than comparing pull requests across the entire repository, RevAudit groups PRs into size cohorts. A small PR is only compared against other small PRs. We compute the median—which resists extreme outliers—and estimate a 90% confidence interval. Any PR taking more than 1.5 times its cohort median is flagged as an anomaly for engineering inspection.",
    diagramId: '02_sequence_audit_request'
  },
  {
    id: '04_validation',
    num: '04',
    category: 'Empirical Case Study',
    title: 'Live Empirical Validation: fastapi/fastapi Repository',
    subtitle: 'Auditing 30 live closed pull requests to verify size-controlled anomaly detection',
    caseStudy: {
      repo: 'fastapi/fastapi',
      totalClosed: 30,
      mergedCount: 9,
      unmergedDropped: 21,
      anomaliesCount: 1,
      cohorts: [
        { name: 'Small PRs (<250 chars)', n: 3, median: '0.39 hrs (~23 mins)', ci: '[0.00h, 2.15h]', threshold: '> 0.58 hrs' },
        { name: 'Large PRs (>1000 chars)', n: 6, median: '8.04 hrs', ci: '[7.56h, 8.51h]', threshold: '> 12.06 hrs' }
      ],
      anomalyHighlight: {
        pr: '#16282',
        title: '👥 Update FastAPI People - Sponsors',
        author: '@pr-submit[bot]',
        size: '34 chars (Small Cohort)',
        reviewTime: '3.55 hours',
        ratio: '9.1x cohort median',
        finding: 'While 3.55 hours is low compared to large refactorings (8h), it is severely anomalous for an automated 34-character sponsor list refresh in a repository where small PRs typically merge within 23 minutes. Size control prevents this bottleneck from going unnoticed.'
      }
    },
    speakerNotes: "Here is empirical validation using live GitHub data from FastAPI. Notice that Large PRs take a median of 8 hours, while Small PRs take 23 minutes. If we didn't control for size, PR #16282 at 3.5 hours would look fast. But because our engine knows it's a 34-character bot update, it correctly flags that it took 9.1 times longer than normal—a statistically significant outlier.",
    diagramId: null
  },
  {
    id: '05_architecture',
    num: '05',
    category: 'System Design',
    title: 'System Architecture & Rapid Prototype Constraints',
    subtitle: 'High-throughput stateless Python ASGI backend with React + Tailwind SPA',
    architecturePoints: [
      {
        layer: 'FastAPI Backend (:8000)',
        details: 'Python ASGI server running vectorized Pandas data grouping, outlier detection, and GitHub REST API v3 client with error and rate-limit handling.'
      },
      {
        layer: 'React Frontend Dashboard (:5173)',
        details: 'Modern reactive SPA serving both as the interactive presentation deck and operational review audit console with instant state synchronization.'
      },
      {
        layer: 'Stateless Prototype Constraint',
        details: 'Engineered within academic 4-hour constraints: zero relational database bloat, on-demand live querying, and resilient error recovery.'
      },
      {
        layer: 'CORS & Deployment Ready',
        details: 'Fully configured CORS middleware enabling cross-origin integration between Vite frontend, local backend, and production Render endpoints.'
      }
    ],
    speakerNotes: "Our architecture was designed for rapid empirical research. We avoided the operational friction of setting up heavy databases upfront, prioritizing a clean, live-data statistical engine using FastAPI and Pandas paired with an interactive React dashboard.",
    diagramId: '06_class_diagram'
  },
  {
    id: '06_team',
    num: '06',
    category: 'Team ArchCoders',
    title: 'Team Roles, Responsibilities & Deliverables',
    subtitle: 'UCS503 Software Engineering Lab specialization and technical division',
    members: [
      {
        name: 'Sparsh Khandelwal',
        role: 'Backend & Statistical Math Engine Lead',
        badge: 'Python / FastAPI / Pandas',
        deliverables: [
          'FastAPI application routing and CORS architecture (backend/main.py)',
          'Pandas data pipeline for survival imputation and cohort median aggregation',
          'GitHub REST API v3 integration with 403 rate-limit and 404 handler',
          'Mathematical 90% confidence interval & 1.5x anomaly threshold algorithms'
        ]
      },
      {
        name: 'Dheeraj',
        role: 'System Architecture & UML Modeling Lead',
        badge: 'PlantUML / Domain Design',
        deliverables: [
          'Authored 5 core Sequence Diagrams (OAuth, Ingestion, Baseline, Audit, PDF)',
          'Authored comprehensive Domain Class Diagram (User, Repo, PR, Model)',
          'Structural entity-relationship and software design documentation',
          'Statistical specification compliance verification'
        ]
      },
      {
        name: 'Adityaraj Singh',
        role: 'Frontend & UI/UX Integration Lead',
        badge: 'React 19 / Tailwind / SVG Charts',
        deliverables: [
          'Single-page application dashboard with live repository audit console',
          'Interactive dual-mode navigation (Academic Slide Deck vs. Live Demo)',
          'Responsive statistical metric cards and sortable anomaly table',
          'PlantUML source code inspectors and SVG diagram rendering'
        ]
      },
      {
        name: 'Vaibhav Goyal',
        role: 'QA, Verification & Testing Lead',
        badge: 'QA / Validation / Slides',
        deliverables: [
          'Edge case testing (unmerged PR filtering, rate limits, 404 not found)',
          'Live endpoint verification against open-source repositories',
          'Academic lab compliance audit and slide rehearsal coordination',
          'Data validation against official GitHub API schemas'
        ]
      }
    ],
    speakerNotes: "Our team divided responsibilities cleanly: Sparsh developed the Python backend and statistical math engine; Dheeraj led the software architecture and authored all PlantUML diagrams; Adityaraj integrated the UI dashboard, and Vaibhav ensured edge-case resilience.",
    diagramId: null
  },
  {
    id: '07_roadmap',
    num: '07',
    category: 'Future Scope',
    title: 'Future Work: Scaling to Production Infrastructure',
    subtitle: 'Architectural roadmap for transitioning from lab prototype to enterprise audit platform',
    roadmapItems: [
      {
        title: '1. Persistent PostgreSQL Database',
        desc: 'Migrate from on-demand stateless queries to relational storage tracking quarterly team review velocity trends and sprint-over-sprint baseline shifts.'
      },
      {
        title: '2. Asynchronous Webhook Ingestion (Celery + Redis)',
        desc: 'Deploy background worker queues listening to GitHub Webhook events (pull_request.closed) to eliminate on-demand HTTP query latency for large repos (5,000+ PRs).'
      },
      {
        title: '3. Reviewer Concurrency & Fatigue ML Model',
        desc: 'Expand the anomaly engine to count active concurrent PR assignments per reviewer using Bayesian regression to isolate reviewer capacity constraints.'
      },
      {
        title: '4. Automated PDF Audit Report Generation',
        desc: 'Implement ReportLab or headless browser export pipeline generating executive PDF audit summaries for engineering leads and project stakeholders.'
      }
    ],
    speakerNotes: "Looking forward, the next step is adding PostgreSQL for historical sprint baselines, GitHub webhooks for real-time background ingestion, and automated PDF export reports for engineering directors.",
    diagramId: '05_sequence_pdf_export'
  },
  {
    id: '08_ethics',
    num: '08',
    category: 'Ethical Safeguards',
    title: 'Ethical Limits & Responsible Research Boundaries',
    subtitle: 'Product safeguards ensuring statistical rigor without punitive misapplication',
    principles: [
      {
        title: 'No Individual Developer Verdicts',
        desc: 'RevAudit evaluates process consistency across cohorts. It never produces individual blame scores or punitive developer ratings.'
      },
      {
        title: 'Patterns, Not Accusations',
        desc: 'Anomalies represent statistical outliers requiring human qualitative context (e.g., waiting for CI builds, design discussions), not developer negligence.'
      },
      {
        title: 'Explicit Sampling Uncertainty',
        desc: 'All baseline medians display 90% confidence intervals. Small sample cohorts are flagged to prevent overconfidence.'
      },
      {
        title: 'Confounder-Controlled Evaluation',
        desc: 'Never judge turnaround time without controlling for pull request size proxy, bot authoring, and survival bias.'
      }
    ],
    speakerNotes: "Finally, our ethical safeguards ensure RevAudit is used constructively. RevAudit flags process bottlenecks and invisible friction—it never ranks or accuses individual engineers.",
    diagramId: null
  }
];

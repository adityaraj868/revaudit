# RevAudit: Product Requirements & Functional Specification Document (PRD)

- **Product Name:** RevAudit (Statistical Audit of Code-Review Consistency and Workload in Open-Source Repositories)[cite: 1, 4]
- **Target Course:** UCS503 Software Engineering Lab, Thapar Institute of Engineering & Technology (TIET)[cite: 1, 3]
- **Lab Instructor / Advisor:** Dr. Sukhpal Singh (Research Associate, TIET)[cite: 3, 4]
- **Engineering Team:** Team ArchCoders (Dheeraj Kumar, Vaibhav Goyal, Adityaraj Singh, Sparsh Khandelwal)[cite: 1, 2]
- **Document Version:** v1.0.0 (Release-Ready MVP Specification)

---

## 1. PRODUCT VISION & OBJECTIVES

### 1.1 Problem Statement
Code review effort exhibits undocumented, invisible variation across open-source communities[cite: 1]. Existing software analytics suites (such as GrimoireLab and the PR Analytics GitHub Action) merely summarize raw response latencies, comment volumes, and individual developer metrics. They fail to isolate genuine review thoroughness from reviewer workload fatigue, and they do not control for patch complexity or repository-level gatekeeping policies[cite: 4].

### 1.2 Core Product Objective
RevAudit is an empirical software engineering analytics and audit platform[cite: 4]. It ingests raw pull-request histories, cleans and decomposes review interactions, and applies a multi-level hierarchical statistical model to detect statistically significant process anomalies (e.g., unexpected delays, iteration bottlenecks) after strictly adjusting for confounding variables (patch size, files changed, subsystem, author familiarity, and concurrent reviewer load)[cite: 4].

### 1.3 Target Personas
1. **Open-Source Repository Maintainers:** Need to identify whether code review delays stem from reviewer workload fatigue or patch complexity, enabling principled reviewer assignment[cite: 4].
2. **Academic Evaluators & Empirical SE Researchers:** Need reproducible pipelines, baseline models, statistical effect sizes with 95% confidence intervals, and synthetic ground-truth shift benchmarks[cite: 4].
3. **Engineering Team Leads:** Seek to improve code quality turnaround without implementing counterproductive developer-ranking metrics[cite: 4].

---

## 2. SCIENTIFIC HYPOTHESES & BASELINE FRAMEWORK

### 2.1 Hypotheses Modeled
- **H1 (Workload Saturation Driver):** Turnaround latency and review iterations are significantly driven by concurrent reviewer workload, independent of patch size[cite: 1, 4].
- **H2 (Residual Cross-Repository Variance):** Substantial residual variation in review turnaround persists across repositories after adjusting for patch churn and author experience[cite: 1, 4].
- **H3 (Blame-Free Anomaly Isolation):** Multi-level hierarchical mixed-effects models isolate statistical process anomalies without ranking developers or assigning individual bias labels[cite: 1, 4].

### 2.2 Research Baselines for Benchmarking
The platform must compute and visually compare against three research baselines[cite: 4]:
1. **Baseline 1 (B1 - Global Pooled OLS):** Standard Ordinary Least Squares regression ignoring hierarchy:
   $$\text{Latency} = \beta_0 + \beta_1(\text{LinesAdded}) + \beta_2(\text{FilesChanged}) + \beta_3(\text{ReviewerWorkload}) + \epsilon$$
2. **Baseline 2 (B2 - Unadjusted Dashboard Model):** Raw rolling median and mean metrics (representing traditional GrimoireLab / GitHub Action metrics)[cite: 4].
3. **Baseline 3 (B3 - Literature Acceptance & Effort Model):** Published logistic/linear models predicting review effort based purely on author prior acceptance rates and churn size[cite: 4].

---

## 3. STRICT ETHICAL & PRIVACY GUARDRAILS

Per laboratory requirements, RevAudit is an **audit of engineering processes, not an individual appraisal tool**[cite: 4]:
1. **Zero Developer Ranking:** The product shall not provide "fastest/slowest reviewer" leaderboards, productivity scorecards, or developer comparison rankings[cite: 4].
2. **Zero Bias / Discrimination Labeling:** The system shall never classify any human reviewer or author as "unfair," "biased," or "discriminatory"[cite: 4].
3. **Mandatory Uncertainty Representation:** Every metric, expected estimate, and anomaly score displayed on the UI must feature a standard error or 95% Confidence Interval ($[\mu - 1.96\cdot\text{SE}, \mu + 1.96\cdot\text{SE}]$)[cite: 4].
4. **Aggregate Investigation Flags:** Flags identify systemic workflow states (e.g., *"Workload Saturation Bottleneck Detected: Concurrent PR volume correlates with a +31.4h review delay"*), explicitly prompting human investigation rather than automated punitive action[cite: 4].

---

## 4. FUNCTIONAL REQUIREMENTS & DATA PIPELINE

### 4.1 Ingestion & Dataset Scope
- **Benchmark Coverage:** Pipeline must track at least **15 active tier-1 open-source repositories** and at least **5,000 pull requests**[cite: 4].
- **Target Repositories:** `facebook/react`, `vuejs/core`, `angular/angular`, `nodejs/node`, `expressjs/express`, `pallets/flask`, `django/django`, `fastapi/fastapi`, `numpy/numpy`, `pandas-dev/pandas`, `scikit-learn/scikit-learn`, `golang/go`, `rust-lang/rust`, `vercel/next.js`, `tailwindlabs/tailwindcss`.

### 4.2 Entity Separation Engine
The ingestion layer must decompose GitHub data into discrete entities[cite: 4]:
- **PullRequest Entity:** Identifiers, author identity, timestamp created/closed/merged, total churn (additions/deletions), files changed, target subsystem[cite: 4].
- **PullRequestReview Entity:** Formal reviews submitted (`APPROVED`, `CHANGES_REQUESTED`, `COMMENTED`)[cite: 4].
- **ReviewComment Entity:** Line-level diff comments attached to commit chunks[cite: 4].
- **IssueComment Entity:** Top-level conversational comments in the PR thread[cite: 4].
- **Bot Isolation Filter:** Any actor matching `[bot]`, `dependabot`, `renovate`, `github-actions`, or automated stale-check accounts must be stripped from human latency calculations[cite: 4].

### 4.3 Tracked Variables Matrix

| Classification | Variable Name | Description / Formula |
| :--- | :--- | :--- |
| **Controlled Confounder** | `lines_added` / `lines_deleted` | Total code churn in patch[cite: 4]. |
| **Controlled Confounder** | `files_changed` | Breadth of patch impact across directory tree[cite: 4]. |
| **Controlled Confounder** | `subsystem` | Functional area tagged (`core`, `api`, `docs`, `tests`, `ui`)[cite: 4]. |
| **Controlled Confounder** | `is_first_time_contributor` | Boolean flag indicating whether author has $\le 1$ prior merged PRs[cite: 4]. |
| **Controlled Confounder** | `reviewer_concurrent_workload` | Count of currently open, assigned PRs assigned to reviewer at event time[cite: 4]. |
| **Measured Outcome** | `time_to_first_review_hrs` | Elapsed hours between PR submission and first human review action[cite: 4]. |
| **Measured Outcome** | `total_review_rounds` | Iteration cycles between commit updates and review state transitions[cite: 4]. |
| **Measured Outcome** | `inline_comment_count` | Detailed code-level comments[cite: 4]. |
| **Measured Outcome** | `issue_comment_count` | General discussion thread messages[cite: 4]. |
| **Measured Outcome** | `was_changes_requested` | Binary indicator of formal rework requests[cite: 4]. |
| **Measured Outcome** | `is_merged` | Ultimate pull-request resolution status[cite: 4]. |

---

## 5. STATISTICAL AUDIT ENGINE SPECIFICATION

### 5.1 Hierarchical Formulation (3 Levels)
To avoid regression fallacy, variance is partitioned into three nested levels[cite: 4]:
- **Level 1 (Observation - Pull Request):** Patch churn, files, subsystem, reviewer concurrent load[cite: 4].
- **Level 2 (Cluster - Reviewer):** Individual historical response capacity and bandwidth[cite: 4].
- **Level 3 (Cluster - Repository):** Governance rules, CI testing runtimes, organizational culture[cite: 4].

$$\text{Latency}_{ijk} = \gamma_{000} + \beta_1(\text{Churn}_{ijk}) + \beta_2(\text{Workload}_{ijk}) + \beta_3(\text{Experience}_{ijk}) + v_{00k} + u_{0jk} + e_{ijk}$$

Where:
- $v_{00k} \sim \mathcal{N}(0, \sigma^2_{\text{repo}})$ is the repository random effect.
- $u_{0jk} \sim \mathcal{N}(0, \sigma^2_{\text{reviewer}})$ is the reviewer random effect.
- $e_{ijk} \sim \mathcal{N}(0, \sigma^2)$ is the observation residual error.

### 5.2 Anomaly Flagging Heuristic
1. Compute the **Expected Latency** ($\hat{Y}$) using the fitted mixed-effects model[cite: 4].
2. Compute **Standardized Residual (Z-Score)**:
   $$Z = \frac{Y_{\text{observed}} - \hat{Y}}{\text{SE}_{\text{cluster}}}$$
3. **Statistical Anomaly Threshold:** Flag repository or subsystem if $|Z| > 2.0$ ($p < 0.05$).
4. **Controlled Shift Validation Check:** In synthetic testing (`numpy/numpy` and `django/django`), artificial latency bottlenecks (+24.0h) are injected to verify that the model correctly recovers injected shifts without triggering false positives elsewhere[cite: 4].

---

## 6. USER INTERFACE & VISUALIZATION WORKBENCH

### 6.1 Dashboard Views
1. **Executive Process KPI Row:**
   - Total Tracked Repositories ($N=15$)[cite: 4].
   - Scrubbed Pull Requests ($N \ge 5,000$)[cite: 4].
   - Primary Modeling Architecture: 3-Level Mixed-Effects Model[cite: 4].
   - Bot Filtering Rate: 100% human-isolated[cite: 4].
2. **Turnaround Variance Plot (Observed vs. Expected):**
   - Dual-bar or scatter visualization comparing observed median review latency against model-adjusted expected latency across all 15 repositories[cite: 4].
   - Interactive error bars rendering the 95% confidence interval for each repository estimate[cite: 4].
3. **Workload vs. Latency Correlation Scatterplot (H1 Testing):**
   - X-Axis: Reviewer Concurrent Workload (Active PR Count)[cite: 4].
   - Y-Axis: Time to First Review (Hours)[cite: 4].
   - Overlaid regression trend showing workload saturation effects[cite: 4].
4. **Repository Statistical Process Table:**
   - Filterable, sortable matrix detailing: Repository Name, Audited PR Sample Size, Observed Turnaround, Expected Baseline, 95% Confidence Interval, Standardized Z-Score, and Anomaly Status Badge[cite: 4].
5. **Ethical Safeguard Banner & Modal:**
   - Persistent banner stating compliance with blame-free evaluation rules, with an interactive popover explaining the absence of developer rankings and how uncertainty scores are derived[cite: 4].

---

## 7. NON-FUNCTIONAL REQUIREMENTS & ACCEPTANCE CRITERIA

### 7.1 Performance & Latency
- Pre-aggregated statistical distributions must load and render in the client in $< 800\text{ ms}$.
- Real-time client-side filtering by repository or anomaly status must respond in $< 50\text{ ms}$.

### 7.2 Reproducibility
- The repository must include a stand-alone Python ingestion script (`cli/ingest.py`) capable of pulling from the GitHub API or generating verified reproducible seed datasets matching empirical review distributions[cite: 4].

### 7.3 Acceptance Verification Criteria (Pass/Fail)
1. **[PASS]** Shows $\ge 15$ repositories and $\ge 5,000$ analyzed PRs[cite: 4].
2. **[PASS]** Ingestion pipeline strictly separates PR reviews, inline comments, and issue comments[cite: 4].
3. **[PASS]** Excludes automated bots from review latency metrics[cite: 4].
4. **[PASS]** Calculates expected latency using controls (churn, workload, experience) rather than unadjusted raw averages[cite: 4].
5. **[PASS]** Displays 95% confidence intervals on all visual charts[cite: 4].
6. **[PASS]** Displays zero developer blame, rankings, or individual bias accusations[cite: 4].
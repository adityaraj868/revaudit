# RevAudit: Presentation Deck & Speaking Notes

**Academic Lab Project for:** Dr. Sukhpal Singh  
**Course:** Software Engineering Laboratory  
**Project:** RevAudit (GitHub Code Review Effort Anomaly Engine)  
**Team:** Team ArchCoders  
**Members:** Sparsh Khandelwal (Backend & Math Lead), Dheeraj (UML & Architecture Lead), Frontend Teammate, QA Teammate

---

### Slide 1: Title & Overview
* **Slide Title:** **RevAudit: Empirical Code Review Analytics**
* **Subtitle:** *Controlling for Pull Request Size and Reviewer Workload to Measure True Review Effort Consistency*
* **Presenter:** Team ArchCoders
* **Target Audience:** Dr. Sukhpal Singh (Academic Lab Evaluation)
* **Bullet Points:**
  * **Core Problem:** Raw turn-around metrics fail because PR sizes and reviewer workloads vary wildly.
  * **Our Solution:** A statistical anomaly engine using live GitHub REST data to evaluate review latency against size-controlled cohort medians.
  * **Prototype Status:** Fully functioning live software acting as both presentation deck and operational tool (0% fake data, 100% live GitHub ingestion).

> **🎤 Speaker Notes:**  
> *"Good morning Dr. Sukhpal Singh and classmates. Today Team ArchCoders presents RevAudit. In modern software engineering, 'time-to-merge' is often used as a metric for team velocity. However, this metric is fundamentally broken because it treats all pull requests equally. RevAudit normalizes PR turnaround times using statistical baselines and flags true review anomalies."*

---

### Slide 2: The Problem (Invisible Variation)
* **Slide Title:** **The Problem: The Flaw in Raw Turnaround Metrics**
* **Visual / Diagram:** `docs/diagrams/04_sequence_pandas_baseline.puml` (or SVG preview)
* **Key Sections:**
  1. **Uncontrolled Confounders:** A 10-line documentation fix taking 48 hours is a major team bottleneck; a 2,500-line architectural overhaul taking 48 hours is blazing fast. Flat averages fail to distinguish the two.
  2. **Perverse "LGTM" Incentives:** When engineers are evaluated on raw turnaround times, they are incentivized to rubber-stamp trivial PRs and delay or avoid complex, critical PRs.
  3. **Reviewer Queueing & Workload Bias:** Senior maintainers carrying high concurrent review loads experience queueing delays that get misattributed to PR complexity rather than system load.
* **Academic Takeaway:** Code review latency in empirical software engineering follows a heavy-tailed, right-skewed distribution (log-normal/Pareto), meaning arithmetic averages ($\mu$) produce misleading conclusions.

> **🎤 Speaker Notes:**  
> *"When software teams look at average review turnaround, they suffer from invisible variation. Confounders like PR complexity and reviewer fatigue hide within the numbers. An engineer who does a rigorous, thorough review on a 2,000-line PR gets penalized by management metrics, while someone who types 'looks good to me' in 5 minutes on a typo fix gets rewarded. We need statistical normalization."*

---

### Slide 3: The Solution (RevAudit Engine)
* **Slide Title:** **The Solution: Size-Controlled Medians & Anomaly Thresholds**
* **Visual / Diagram:** `docs/diagrams/02_sequence_audit_request.puml`
* **Four-Stage Analytical Pipeline:**
  1. **Live Ingestion & Survival Bias Cleaning:** Ingests live closed PRs via GitHub REST API v3 and discards unmerged/abandoned branches (`merged_at.notna()`) to eliminate survivor bias.
  2. **Complexity Cohort Stratification:** Groups PRs by body length proxy ($L_{\text{body}}$):
     * **Small Cohort:** $< 250$ characters (minor bugfixes, docs)
     * **Medium Cohort:** $250 - 1000$ characters (typical features)
     * **Large Cohort:** $> 1000$ characters (major architectural PRs)
  3. **Non-Parametric Central Tendency ($\text{Median}$):** Uses cohort medians ($\tilde{x}$) rather than means, paired with a 90% Confidence Interval ($CI_{90} = \tilde{x} \pm 1.645 \cdot \frac{s}{\sqrt{n}}$).
  4. **The $1.5\times$ Outlier Heuristic:** Flags any PR where:
     $$\Delta t_{\text{review}} > 1.5 \times \text{Cohort Median}$$

> **🎤 Speaker Notes:**  
> *"Rather than comparing PRs across the whole repo, RevAudit creates size cohorts. A small PR is only judged against other small PRs. We calculate the median—which resists extreme outliers—and compute a 90% confidence interval. If a small PR takes more than 1.5 times the typical small PR median, it's flagged as an anomaly for engineering leads to inspect."*

---

### Slide 4: Empirical Validation (Live Case Study)
* **Slide Title:** **Live Empirical Validation: `fastapi/fastapi` Repository**
* **Context:** Audited the 30 most recently closed pull requests on GitHub live.
* **Results Matrix:**

| PR Cohort | Sample Size ($n$) | Median Review Latency ($\tilde{x}$) | 90% Confidence Interval ($CI_{90}$) | Anomaly Threshold ($1.5\times$) |
| :--- | :--- | :--- | :--- | :--- |
| **Small PRs** (<250 chars) | 3 PRs | **0.39 hours** (~23 mins) | $[0.00\text{h}, 2.15\text{h}]$ | $> 0.58\text{ hours}$ |
| **Large PRs** (>1000 chars) | 6 PRs | **8.04 hours** | $[7.56\text{h}, 8.51\text{h}]$ | $> 12.06\text{ hours}$ |

* **Flagged Anomaly Highlight:**
  * **PR #16282** (`👥 Update FastAPI People - Sponsors`)
  * **Author:** `@pr-submit[bot]`
  * **PR Size:** 34 characters (Small)
  * **Actual Review Duration:** **`3.55 hours`**
  * **Variance Ratio:** **`9.1× higher than cohort median`**
  * **Diagnosis:** Even though 3.5 hours looks fast on paper, for a 34-character automated sponsor update on FastAPI, it took 9 times longer than standard baseline.

> **🎤 Speaker Notes:**  
> *"Here is empirical proof using live data from FastAPI. Notice that Large PRs take a median of 8 hours, while Small PRs take 23 minutes. If we didn't control for size, PR #16282 at 3.5 hours would look fast. But because our engine knows it's a 34-character bot update, it flags that it took 9.1 times longer than normal—a statistically significant outlier."*

---

### Slide 5: System Architecture & Tech Stack
* **Slide Title:** **System Architecture & Rapid Prototype Constraints**
* **Visual / Diagram:** `docs/diagrams/06_class_diagram.puml`
* **Architecture Highlights:**
  * **Backend (FastAPI & Pandas):** High-throughput Python ASGI framework running a vectorized Pandas data cleaning and grouping pipeline.
  * **Frontend (React + Tailwind CSS):** Single-page application serving both as the dynamic slide deck and the live testing console.
  * **Stateless by Design:** Zero database dependency for the 4-hour lab prototype constraint; hits live GitHub REST API v3 with automatic rate-limit and 404 detection.
  * **CORS Architecture:** Configured `CORSMiddleware` enabling browser cross-origin requests between Vite (`:5173`) and FastAPI (`:8000`).

> **🎤 Speaker Notes:**  
> *"Our architecture was designed to meet Dr. Sukhpal's strict 4-hour prototype constraints. We avoided the overhead of setting up databases like PostgreSQL upfront, prioritizing a clean, live-data statistical engine using FastAPI and Pandas with an interactive React dashboard."*

---

### Slide 6: Team ArchCoders Contributions
* **Slide Title:** **Team ArchCoders: Role Distribution & Ownership**
* **Grid of Contributions:**
  1. **Sparsh Khandelwal (Backend & Math Engine Lead):**
     * FastAPI REST service, Pandas analytical pipeline, GitHub REST API client, statistical median & confidence interval calculations, anomaly multiplier heuristics.
  2. **Dheeraj & Teammate 1 (UML & System Architecture Leads):**
     * Authored 5 detailed PlantUML sequence diagrams (OAuth, API fetch, baseline calculation, audit request, PDF export) and the domain class diagram.
  3. **Frontend Teammate (UI/UX & Integration Lead):**
     * React + Tailwind SPA, tab-based presentation/demo switcher, responsive anomaly matrix, live loading states.
  4. **QA & Validation Lead:**
     * Edge case testing (unmerged PR filtering, rate-limit 403 handling, 404 repository not found), live lab demonstration verification.

> **🎤 Speaker Notes:**  
> *"Our team divided responsibilities cleanly: Sparsh developed the Python backend and statistical math engine; Dheeraj led the software architecture and authored all PlantUML diagrams; our frontend teammate integrated the UI dashboard, and QA ensured edge-case resilience."*

---

### Slide 7: Future Work (Adding PostgreSQL & ML)
* **Slide Title:** **Future Roadmap: Scaling to Production**
* **Visual / Diagrams:** `docs/diagrams/01_sequence_oauth.puml` & `docs/diagrams/05_sequence_pdf_export.puml`
* **Roadmap Items:**
  1. **PostgreSQL Persistence:** Migrate from on-the-fly stateless queries to relational storage tracking quarterly team velocity trends.
  2. **Asynchronous Webhook Ingestion:** Implement Celery + Redis workers listening to GitHub Webhook events (`pull_request.closed`) to eliminate on-demand API latency.
  3. **Reviewer Workload Modeling:** Expand the anomaly engine to count active concurrent PR assignments per reviewer using Bayesian fatigue modeling.
  4. **Automated PDF Export:** Direct PDF audit report generation for engineering managers.

> **🎤 Speaker Notes:**  
> *"Looking forward, the next step is adding PostgreSQL for historical sprint baselines, GitHub webhooks for real-time background ingestion, and automated PDF export reports for engineering directors."*

---

### Slide 8: Live Demo Transition
* **Slide Title:** **Live Software Demonstration**
* **Call to Action:** Switch from "Presentation Deck" tab to "Live Demo" tab.
* **Demonstration Steps:**
  1. Input `fastapi/fastapi` or `pallets/flask`.
  2. Click **Run Audit**.
  3. Observe real-time data ingestion, cohort medians, and the flagged anomaly table.

> **🎤 Speaker Notes:**  
> *"Now, let's step away from the slides and demonstrate the working software live on GitHub repositories..."*

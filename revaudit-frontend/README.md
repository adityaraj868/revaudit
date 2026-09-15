# RevAudit Frontend UI

**Academic Lab Project for:** Dr. Sukhpal Singh  
**Course:** UCS503 Software Engineering Lab, Thapar Institute of Engineering & Technology (TIET)  
**Team:** Team ArchCoders (Dheeraj Kumar, Vaibhav Goyal, Adityaraj Singh, Sparsh Khandelwal)  

---

## 🎨 Overview & Features
The **RevAudit** frontend is a high-performance React 18 / TypeScript application built with Tailwind CSS, Recharts, and Lucide icons. It delivers an ethical, blame-free PR reviewer capacity and review consistency audit interface.

### Key UI Capabilities:
1. **On-Demand GitHub Audit**: Paste any public GitHub repo URL (`https://github.com/owner/repo`) or click quick chips.
2. **5-KPI Metric Header**:
   - *Review Turnaround* (Observed Mean vs. Repo Expected Baseline)
   - *Reviewer Workload* (Concurrent PRs per reviewer with saturation warning)
   - *Consistency Spread* (Spread multiplier & discrepancy rate)
   - *Review Rigor & Depth* (Diff comments & iteration rounds)
   - *Process Health* (95% Confidence Interval)
3. **Internal Statistical Baseline Panel**: Displays within-repo $R^2$, workload drag ($\beta_{\text{workload}}$), and anomalous PR counts.
4. **Peer PR Discrepancy & Consistency Inspector**: Pairwise comparison cards proving the core problem statement for matched-size PRs.
5. **Interactive PR Review Audit Table**: Search, filter by anomaly/disparity type, view peer disparity multiplier, and click rows to highlight peer cohorts.
6. **Academic Benchmark Suite Modal**: Inspect the full 15-repository reference benchmark.

---

## 🚀 Quickstart

```bash
# Install dependencies (if not already installed)
npm install

# Start Vite Development Server
npm run dev

# Build for Production
npm run build
```

---

## 📁 Component Hierarchy

```
revaudit-frontend/
├── src/
│   ├── pages/
│   │   └── AuditDashboard.tsx         # Main PR Reviewer Audit Dashboard
│   ├── components/
│   │   ├── PRReviewerMetricCards.tsx  # 5-card analytical KPI header
│   │   ├── PRPairComparison.tsx       # Pairwise same-size PR consistency inspector
│   │   ├── PRReviewAuditTable.tsx     # Full PR review audit table with peer disparity
│   │   ├── RepoObservedVsExpectedChart.tsx  # Distribution curve vs repo baseline
│   │   ├── ReviewRigorChart.tsx       # Turnaround vs churn size bins
│   │   ├── WorkloadScatter.tsx        # Latency vs reviewer load regression curve
│   │   ├── AcademicBenchmarkModal.tsx # 15-repository empirical benchmark modal
│   │   └── EthicalBanner.tsx          # UCS503 blame-free ethical safeguard notice
│   ├── types/
│   │   └── audit.ts                   # TypeScript interfaces and data models
│   └── data/                          # Pre-compiled local statistical models and PR records
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

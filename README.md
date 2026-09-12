# RevAudit (Team ArchCoders)

> **Academic Lab Project for Dr. Sukhpal Singh**  
> Analyzing GitHub Pull Request history to determine consistency in code review effort, controlling for PR size and reviewer workload.

---

## 🌟 Key Features
* **Statistically Controlled Review Baselines**: Uses PR body length as a complexity proxy to segment pull requests into Small (< 250 chars), Medium (250–1000 chars), and Large (> 1000 chars) cohorts.
* **Outlier & Anomaly Detection**: Computes cohort medians with mock 90% confidence intervals and flags PRs taking > 1.5× group median.
* **Live Ingestion**: Directly hits GitHub's REST API v3 with automatic imputation (dropping abandoned/unmerged PRs) and rate-limit handling.
* **Dual-View Web Interface**: Replaces PowerPoint slides with an interactive, responsive presentation deck alongside a live demo dashboard.
* **PlantUML Architecture Suite**: Includes 5 detailed sequence diagrams and a comprehensive domain class diagram.

---

## 🚀 Quickstart Guide

### 1. Backend (FastAPI & Pandas Engine)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend API will be accessible at: `http://localhost:8000`  
Swagger / OpenAPI Docs: `http://localhost:8000/docs`

### 2. Frontend (React + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev
```
Frontend UI will be accessible at: `http://localhost:5173`

---

## 📊 PlantUML Diagrams
Located in `docs/diagrams/`:
1. `01_sequence_oauth.puml`: Contributor logging in via GitHub OAuth.
2. `02_sequence_audit_request.puml`: Frontend requesting a repo audit from FastAPI.
3. `03_sequence_github_fetch.puml`: Backend fetching and paginating data from GitHub REST API.
4. `04_sequence_pandas_baseline.puml`: Pandas engine calculating size-controlled baselines and flagging anomalies.
5. `05_sequence_pdf_export.puml`: User exporting final flagged analytics to a PDF report.
6. `06_class_diagram.puml`: Domain entity model (`User`, `Repository`, `PullRequest`, `ReviewEvent`, `StatisticalModel`).

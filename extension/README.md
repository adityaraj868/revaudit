# RevAudit Chrome Extension 🔍

> Lightweight, zero-dependency Manifest V3 Chrome Extension for real-time GitHub PR review auditing, cohort baseline calculation, and review latency anomaly detection.

---

## 🌟 Features

* **Manifest V3 Compliant:** Fast, lightweight, and adheres to the latest Chrome security guidelines.
* **Auto-Detect Current Tab:** Automatically extracts `:owner/:repo` whenever you are viewing any GitHub repository or PR page in Chrome.
* **Built-in GitHub Authentication:** One-click connect via Personal Access Token or OAuth 2.0 WebAuthFlow to boost API rate limits from **60/hr to 5,000/hr**, enabling comprehensive PR review history analysis without getting rate-limited.
* **Live Rate Limit Monitor:** Real-time indicator displaying your remaining GitHub API calls and quota reset countdown.
* **Size Cohort Baselines:** Categorizes pull requests into **Small** (<250 chars), **Medium** (250–1000 chars), and **Large** (>1000 chars) buckets, computing median review turnaround time and 90% confidence intervals.
* **Latency Anomaly Detection:** Flags pull requests whose turnaround time exceeds **1.5× the group baseline median**, displaying the exact slowdown ratio.
* **Private Repository Access:** Authenticated users can audit private repositories they have access to.

---

## 🚀 How to Install in Chrome / Brave / Edge

1. Open your browser and navigate to:
   * **Chrome:** `chrome://extensions/`
   * **Brave:** `brave://extensions/`
   * **Edge:** `edge://extensions/`
2. Toggle on **"Developer mode"** in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the `extension/` folder from this repository (`revaudit/extension/`).
5. The **RevAudit** extension icon will now appear in your browser toolbar!

---

## 💡 How to Use

1. Click the **RevAudit** icon in your browser toolbar.
2. If you are currently browsing a GitHub repo (e.g. `github.com/facebook/react`), click **"Current Tab"** (or it will auto-detect).
3. Alternatively, enter any repository owner and name manually (or click any of the popular sample chips like `pallets/flask`).
4. Click **"Audit Reviews"**.
5. View:
   * Total PRs Analyzed & Merged Count
   * Overall Median Turnaround Time
   * Size Cohort Baselines with 90% Confidence Intervals
   * Flagged Anomalies with direct links to the anomalous GitHub PRs.

---

## 📁 File Structure

```text
extension/
├── manifest.json       # Manifest V3 extension configuration
├── popup.html          # Extension popup UI
├── popup.css           # Dark theme styling matching RevAudit web app
├── popup.js            # Tab detection & client-side statistical engine
├── icons/              # Extension icons (16px, 48px, 128px PNGs)
└── README.md           # Documentation & installation guide
```

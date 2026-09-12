#!/usr/bin/env python3
"""
RevAudit Data Ingestion & Synthetic Benchmark Generator
Course: UCS503 Software Engineering Lab, TIET
Advisor: Dr. Sukhpal Singh | Team ArchCoders
"""

import os
import sys
import json
import math
import random
import datetime
from typing import List, Dict, Any

from bot_filter import is_bot_actor

RANDOM_SEED = 42
random.seed(RANDOM_SEED)

TARGET_REPOSITORIES = [
    {"repo_name": "facebook/react", "category": "Frontend Framework", "base_latency": 14.5, "ci_runtime_min": 18},
    {"repo_name": "vuejs/core", "category": "Frontend Framework", "base_latency": 11.2, "ci_runtime_min": 12},
    {"repo_name": "angular/angular", "category": "Frontend Framework", "base_latency": 26.8, "ci_runtime_min": 45},
    {"repo_name": "nodejs/node", "category": "Runtime / Systems", "base_latency": 32.4, "ci_runtime_min": 60},
    {"repo_name": "expressjs/express", "category": "Backend Framework", "base_latency": 48.0, "ci_runtime_min": 8},
    {"repo_name": "pallets/flask", "category": "Backend Framework", "base_latency": 22.1, "ci_runtime_min": 10},
    {"repo_name": "django/django", "category": "Backend Framework", "base_latency": 19.5, "ci_runtime_min": 35, "inject_shift": True},
    {"repo_name": "fastapi/fastapi", "category": "Backend Framework", "base_latency": 38.5, "ci_runtime_min": 15},
    {"repo_name": "numpy/numpy", "category": "Scientific Computing", "base_latency": 21.0, "ci_runtime_min": 40, "inject_shift": True},
    {"repo_name": "pandas-dev/pandas", "category": "Scientific Computing", "base_latency": 28.5, "ci_runtime_min": 55},
    {"repo_name": "scikit-learn/scikit-learn", "category": "Machine Learning", "base_latency": 24.0, "ci_runtime_min": 50},
    {"repo_name": "golang/go", "category": "Language / Toolchain", "base_latency": 16.2, "ci_runtime_min": 25},
    {"repo_name": "rust-lang/rust", "category": "Language / Toolchain", "base_latency": 34.0, "ci_runtime_min": 90},
    {"repo_name": "vercel/next.js", "category": "Web Platform", "base_latency": 13.8, "ci_runtime_min": 22},
    {"repo_name": "tailwindlabs/tailwindcss", "category": "Styling & UI", "base_latency": 10.5, "ci_runtime_min": 7}
]

SUBSYSTEMS = ["core", "api", "docs", "tests", "ui"]
SUBSYSTEM_WEIGHTS = [0.35, 0.25, 0.15, 0.15, 0.10]
SUBSYSTEM_LATENCY_FACTORS = {
    "core": 1.35,
    "api": 1.10,
    "docs": 0.55,
    "tests": 0.85,
    "ui": 0.95
}

TITLES_BY_REPO = {
    "facebook/react": [
        "fix(compiler): optimize memoization cache lookup for nested scopes",
        "feat(react-dom): implement streaming server action boundaries",
        "perf(fiber): eliminate redundant parent bailouts in concurrent mode",
        "docs(hooks): clarify useEffect cleanup vs layout ordering",
        "test(devtools): add regression test for timeline component tree"
    ],
    "vuejs/core": [
        "fix(runtime-core): prevent memory leak in KeepAlive slot caching",
        "feat(compiler-sfc): support generic props type inference in script setup",
        "perf(reactivity): speed up reactive trigger loop with bitwise flags",
        "docs(guide): update reactivity transform migration notes",
        "test(ssr): cover teleports nested within suspense boundary"
    ],
    "angular/angular": [
        "feat(signals): introduce linkedSignal reactive primitive",
        "fix(router): resolve navigation cancellation race condition",
        "perf(core): inline host binding evaluations for standalone components",
        "docs(forms): add untyped to typed reactive forms tutorial",
        "test(compiler-cli): verify template typecheck diagnostic messages"
    ],
    "nodejs/node": [
        "src: optimize async_hooks execution context preservation",
        "lib: improve WHATWG URL parsing speed on punycode domains",
        "test: add worker_threads transfer list stress scenario",
        "doc: specify process.exitCode precedence rules clearly",
        "crypto: fix XOF digest buffer overflow guard"
    ],
    "expressjs/express": [
        "router: resolve wildcard route segment trailing slash mismatch",
        "response: handle backpressure correctly when piping gzip stream",
        "docs: modernize middleware err-first signature examples",
        "test: expand test suite for custom error handling delegates",
        "lib: refine sub-app mounting event propagation"
    ],
    "pallets/flask": [
        "fix: ensure async view functions cleanly unwrap exception groups",
        "feat: add CLI autocompletion hints for nested Blueprint commands",
        "docs: emphasize application context lifespan inside background tasks",
        "test: verify session cookie samesite=lax on redirect",
        "refactor: clean up typing annotations for current_app proxies"
    ],
    "django/django": [
        "Fixed #34912 -- Allowed QuerySet.update() across joined tables in Postgres",
        "Refs #35100 -- Optimized Model.save() field validation cache",
        "Fixed #34882 -- Prevented XSS in Admin ReadOnlyPasswordHashWidget",
        "Docs: Expanded documentation on asynchronous ORM iteration",
        "Tests: Added unit coverage for JSONField key transforms on SQLite"
    ],
    "fastapi/fastapi": [
        "feat: support annotated dependency overrides in sub-routers",
        "fix: properly serialize recursive Pydantic v2 validation errors",
        "docs: add security oauth2 scopes tutorial with token refresh",
        "test: add websocket disconnect event handling coverage",
        "perf: optimize response JSON encoding with orjson fallback"
    ],
    "numpy/numpy": [
        "ENH: implement SIMD vectorization for np.sin on AVX-512 targets",
        "BUG: fix dtype promotion in np.linalg.lstsq for complex64 inputs",
        "DOC: clarify broadcast rules for 3D tensor outer products",
        "MAINT: update cpython C-API refcounting compatibility headers",
        "TEST: add hypothesis-based fuzz tests for masked arrays"
    ],
    "pandas-dev/pandas": [
        "BUG: fix DataFrame.groupby rolling window aggregation on NaT dates",
        "ENH: support Arrow-backed StringArray zero-copy concatenation",
        "DOC: document PyArrow string backend performance tradeoffs",
        "PERF: vectorize CategoricalIndex reindexing on sorted keys",
        "TEST: add test case for MultiIndex slicing with loc and step"
    ],
    "scikit-learn/scikit-learn": [
        "FEA: add sample_weight support to HistGradientBoostingClassifier",
        "FIX: prevent division by zero in Silhouette score on solitary clusters",
        "DOC: illustrate decision boundary display with multi-class estimators",
        "PERF: parallelize sparse matrix dot products in SGDRegressor",
        "TST: increase precision bounds on t-SNE embedding sanity tests"
    ],
    "golang/go": [
        "cmd/compile: optimize escape analysis for slice allocations in loops",
        "runtime: reduce GC mark termination stop-the-world latency",
        "net/http: handle HTTP/2 RST_STREAM frames without goroutine leak",
        "doc/go1.23: add release notes for range-over-func iteration",
        "crypto/tls: support post-quantum Kyber768 hybrid key exchange"
    ],
    "rust-lang/rust": [
        "compiler: improve trait solver diagnostic for cyclical associated types",
        "library: add NonZero::new_unchecked const stabilization",
        "rustdoc: fix search index ranking on ambiguous generic traits",
        "docs: clarify pin projection guarantees in core::pin",
        "tests: add compile-fail UI test for lifetime subtyping in closures"
    ],
    "vercel/next.js": [
        "fix(next/image): preserve aspect ratio on fill layouts with srcset",
        "feat(turbopack): speed up incremental HMR rebuilds in App Router",
        "perf(server): optimize server component payload compression",
        "docs(routing): add parallel routes and intercepting route cookbook",
        "test(e2e): verify Server Actions optimistic update state transitions"
    ],
    "tailwindlabs/tailwindcss": [
        "feat(oxide): introduce ultrafast Rust-based CSS scanning engine",
        "fix(core): preserve arbitrary value escaping in media queries",
        "docs: document dynamic viewport height utilities (dvh, svh, lvh)",
        "perf: optimize color palette generation via color space lookup table",
        "test: assert correct specificity order on chained pseudo-classes"
    ]
}

def generate_dataset(total_prs: int = 5400) -> List[Dict[str, Any]]:
    prs = []
    prs_per_repo = math.ceil(total_prs / len(TARGET_REPOSITORIES)) # 360 PRs per repo
    base_date = datetime.datetime(2025, 1, 1, 10, 0, 0)
    
    bot_authors = ["dependabot[bot]", "renovate[bot]", "github-actions[bot]", "codecov[bot]"]
    
    for repo_idx, repo_info in enumerate(TARGET_REPOSITORIES):
        repo_name = repo_info["repo_name"]
        base_latency = repo_info["base_latency"]
        inject_shift = repo_info.get("inject_shift", False)
        titles = TITLES_BY_REPO.get(repo_name, ["fix: address edge case in core pipeline"])
        
        # 1. Human PRs (360 per repo)
        for i in range(1, prs_per_repo + 1):
            pr_num = 1000 + i
            pr_id = f"{repo_name.replace('/', '_')}_PR_{pr_num}"
            
            subsystem = random.choices(SUBSYSTEMS, weights=SUBSYSTEM_WEIGHTS)[0]
            subsystem_factor = SUBSYSTEM_LATENCY_FACTORS[subsystem]
            
            is_first_time = (random.random() < 0.28)
            author_id = f"contributor_{repo_idx}_{random.randint(100, 999)}" if is_first_time else f"core_dev_{repo_idx}_{random.randint(1, 35)}"
            
            raw_churn = int(math.exp(random.gauss(4.2, 0.9)))
            lines_added = max(3, int(raw_churn * random.uniform(0.6, 0.85)))
            lines_deleted = max(1, int(raw_churn * random.uniform(0.15, 0.4)))
            files_changed = max(1, min(35, int(math.exp(random.gauss(1.4, 0.7)))))
            
            # Reviewer concurrent workload (H1 testing variable: 1 to 14 active open PRs)
            reviewer_workload = max(1, min(14, int(random.gauss(4.5, 2.0))))
            
            # Empirical DGP for Review Turnaround:
            # Latency = Base + Churn*0.015 + Workload*3.12 + FirstTime*5.2 + Files*0.65 + SubsystemOffset + Noise
            churn_effect = (lines_added / 100.0) * 0.95
            workload_effect = reviewer_workload * 3.12
            experience_effect = 5.20 if is_first_time else 0.0
            files_effect = (files_changed / 4.0) * 0.85
            noise = random.gauss(0, 2.5)
            
            latency_hrs = (
                base_latency 
                + churn_effect 
                + workload_effect 
                + experience_effect 
                + files_effect 
                + (subsystem_factor - 1.0) * 8.0 
                + noise
            )
            
            # Synthetic shift injection (+24.0h bottleneck on numpy and django)
            shift_applied = False
            if inject_shift:
                if i % 5 < 3: # 60% of PRs in shifted repo get +24.0h
                    latency_hrs += 24.0
                    shift_applied = True
                    
            latency_hrs = max(0.8, round(latency_hrs, 2))
            
            if latency_hrs > 40.0:
                review_rounds = random.randint(2, 5)
                inline_comments = random.randint(4, 18)
                issue_comments = random.randint(2, 8)
                was_changes_requested = True
            elif latency_hrs > 20.0:
                review_rounds = random.randint(1, 3)
                inline_comments = random.randint(1, 8)
                issue_comments = random.randint(1, 4)
                was_changes_requested = (random.random() < 0.45)
            else:
                review_rounds = 1
                inline_comments = random.randint(0, 4)
                issue_comments = random.randint(0, 2)
                was_changes_requested = (random.random() < 0.15)
                
            is_merged = (random.random() < 0.88)
            
            created_delta_days = (i * 0.8) + (repo_idx * 20)
            created_at = base_date + datetime.timedelta(days=created_delta_days, hours=random.randint(0, 23))
            closed_at = created_at + datetime.timedelta(hours=latency_hrs * 1.5 + 2.0)
            merged_at = closed_at if is_merged else None
            
            prs.append({
                "pr_id": pr_id,
                "repo_name": repo_name,
                "category": repo_info["category"],
                "title": random.choice(titles),
                "author_id": author_id,
                "is_first_time_contributor": is_first_time,
                "created_at": created_at.isoformat() + "Z",
                "closed_at": closed_at.isoformat() + "Z",
                "merged_at": merged_at.isoformat() + "Z" if merged_at else None,
                "lines_added": lines_added,
                "lines_deleted": lines_deleted,
                "files_changed": files_changed,
                "subsystem": subsystem,
                "reviewer_concurrent_workload": reviewer_workload,
                "time_to_first_review_hours": latency_hrs,
                "total_review_rounds": review_rounds,
                "inline_comment_count": inline_comments,
                "issue_comment_count": issue_comments,
                "was_changes_requested": was_changes_requested,
                "is_merged": is_merged,
                "is_bot": False,
                "synthetic_shift_injected": shift_applied
            })
            
        # 2. Automated Bot PRs (40 per repo = 600 bot PRs)
        for b in range(1, 41):
            bot_pr_num = 9000 + b
            b_id = f"{repo_name.replace('/', '_')}_BOT_{bot_pr_num}"
            bot_name = random.choice(bot_authors)
            b_created = base_date + datetime.timedelta(days=b*6 + repo_idx*5)
            
            prs.append({
                "pr_id": b_id,
                "repo_name": repo_name,
                "category": repo_info["category"],
                "title": f"build(deps): bump dependencies in /{repo_name.split('/')[1]}",
                "author_id": bot_name,
                "is_first_time_contributor": False,
                "created_at": b_created.isoformat() + "Z",
                "closed_at": (b_created + datetime.timedelta(minutes=15)).isoformat() + "Z",
                "merged_at": (b_created + datetime.timedelta(minutes=15)).isoformat() + "Z",
                "lines_added": 4,
                "lines_deleted": 4,
                "files_changed": 2,
                "subsystem": "core",
                "reviewer_concurrent_workload": 0,
                "time_to_first_review_hours": 0.05,
                "total_review_rounds": 1,
                "inline_comment_count": 0,
                "issue_comment_count": 1,
                "was_changes_requested": False,
                "is_merged": True,
                "is_bot": True,
                "synthetic_shift_injected": False
            })
            
    return prs

def main():
    print("=" * 70)
    print(" RevAudit CLI Ingestion & Ground-Truth Shift Generator")
    print(" Course: UCS503 Lab, TIET | Advisor: Dr. Sukhpal Singh")
    print("=" * 70)
    
    prs = generate_dataset(total_prs=5400)
    human_count = len([p for p in prs if not p["is_bot"]])
    bot_count = len([p for p in prs if p["is_bot"]])
    
    print(f"[+] Total PR Records Generated: {len(prs)}")
    print(f"[+] Human PR Records (Analyzed): {human_count}")
    print(f"[+] Bot PR Records (Filtered):   {bot_count}")
    print(f"[+] Repositories Covered:        {len(TARGET_REPOSITORIES)}")
    
    # Write to api/seed_dataset.json and data/seed_pr_records.json
    os.makedirs("api", exist_ok=True)
    os.makedirs("data", exist_ok=True)
    
    with open("api/seed_dataset.json", "w") as f:
        json.dump(prs, f, indent=2)
        
    with open("data/seed_pr_records.json", "w") as f:
        json.dump(prs, f, indent=2)
        
    print("[+] Successfully exported dataset to api/seed_dataset.json")

if __name__ == "__main__":
    main()

export const UML_DIAGRAMS = [
  {
    id: '01_sequence_oauth',
    num: '01',
    title: 'Contributor Login via GitHub OAuth',
    type: 'Sequence Diagram',
    svgPath: `${import.meta.env.BASE_URL}diagrams/01_sequence_oauth.svg`,
    pumlPath: `${import.meta.env.BASE_URL}diagrams/01_sequence_oauth.puml`,
    fallbackSvg: `${import.meta.env.BASE_URL}diagrams/01_sequence_oauth.svg`,
    sourceFile: 'docs/diagrams/01_sequence_oauth.puml',
    description: 'Models GitHub OAuth authorization handoff, state validation, encrypted server-side session persistence, and client session restoration.',
    puml: `@startuml sequence_oauth
!theme plain
autonumber
skinparam BoxPadding 10
skinparam ParticipantPadding 15

title Sequence Diagram: Contributor Login via GitHub OAuth

actor "Contributor\\n(Reviewer/Lead)" as User
participant "React Frontend\\n(RevAudit UI)" as Frontend
participant "FastAPI Backend\\n(OAuth Gateway)" as Backend
database "Neon/Postgres\\n(auth_sessions)" as DB
participant "GitHub OAuth\\nProvider" as GitHub

User -> Frontend : Click "Sign in with GitHub"
activate Frontend

Frontend -> GitHub : Redirect to /login/oauth/authorize\\n(client_id, scope=repo,read:user)
activate GitHub
GitHub --> User : Prompt for GitHub Credentials & Scopes
User -> GitHub : Authorize Application Permissions
GitHub --> Backend : Redirect to Callback URL with ?code=AUTH_CODE
deactivate GitHub

Backend -> Backend : GET /auth/github/callback\\n{code: AUTH_CODE, state: STATE}
activate Backend

Backend -> GitHub : POST https://github.com/login/oauth/access_token\\n{client_id, client_secret, code}
activate GitHub
GitHub --> Backend : 200 OK (access_token, token_type, scope)
deactivate GitHub

Backend -> GitHub : GET https://api.github.com/user\\n(Authorization: Bearer access_token)
activate GitHub
GitHub --> Backend : 200 OK (id, login, avatar_url, email)
deactivate GitHub

Backend -> Backend : Validate OAuth state
Backend -> Backend : Encrypt GitHub access token
Backend -> DB : Persist user + encrypted OAuth session
DB --> Backend : Opaque session identifier
Backend --> Frontend : Redirect with signed browser session
deactivate Backend

Frontend -> Backend : GET /api/auth/me with session cookie
Backend --> Frontend : {authenticated: true, user: profile}
Frontend --> User : Display Authenticated Profile & Repositories
deactivate Frontend

@enduml`
  },
  {
    id: '02_sequence_audit_request',
    num: '02',
    title: 'Frontend Requesting Repo Audit',
    type: 'Sequence Diagram',
    svgPath: `${import.meta.env.BASE_URL}diagrams/02_sequence_audit_request.svg`,
    pumlPath: `${import.meta.env.BASE_URL}diagrams/02_sequence_audit_request.puml`,
    fallbackSvg: `${import.meta.env.BASE_URL}diagrams/02_sequence_audit_request.svg`,
    sourceFile: 'docs/diagrams/02_sequence_audit_request.puml',
    description: 'Illustrates the end-to-end client audit request cycle: parameter dispatch, backend async fetch, statistical computation handoff, and UI baseline rendering.',
    puml: `@startuml sequence_audit_request
!theme plain
autonumber
skinparam BoxPadding 10
skinparam ParticipantPadding 15

title Sequence Diagram: Frontend Requesting Repo Audit from FastAPI

actor "User / Review Lead" as User
participant "React Frontend\\n(Audit Dashboard)" as Frontend
participant "FastAPI Controller\\n(/api/audit)" as API
participant "Pandas Statistical Engine\\n(Data Aggregator)" as Engine

User -> Frontend : Enter 'owner/repo' & click "Run Audit"
activate Frontend

Frontend -> Frontend : Set loading state = true\\nClear previous anomaly data

Frontend -> API : GET /api/audit?owner={owner}&repo={repo}
activate API

API -> API : Validate query parameters\\nCheck rate limit headers

API -> Engine : run_audit_pipeline(raw_prs)
activate Engine

Engine -> Engine : Retain open/closed PRs\\nExtract first human review event\\nRight-censor unreviewed PRs\\nGroup by changed lines/files\\nKaplan-Meier + bootstrap 95% CI\\nRobust adjusted residual triage

Engine --> API : Return {baseline_medians, anomalies: [...], health_score}
deactivate Engine

API --> Frontend : 200 OK JSON (Audit Payload)
deactivate API

Frontend -> Frontend : Update baseline KPI cards\\nRender anomaly table & CI badges\\nSet loading state = false
Frontend --> User : Present interactive audit report
deactivate Frontend

@enduml`
  },
  {
    id: '03_sequence_github_fetch',
    num: '03',
    title: 'Backend Ingestion & Pagination from GitHub API',
    type: 'Sequence Diagram',
    svgPath: `${import.meta.env.BASE_URL}diagrams/03_sequence_github_fetch.svg`,
    pumlPath: `${import.meta.env.BASE_URL}diagrams/03_sequence_github_fetch.puml`,
    fallbackSvg: `${import.meta.env.BASE_URL}diagrams/03_sequence_github_fetch.svg`,
    sourceFile: 'docs/diagrams/03_sequence_github_fetch.puml',
    description: 'Details bounded Link-header pagination, incremental sync stopping, review-event retrieval, rate-limit handling (403), and missing repository handling (404).',
    puml: `@startuml sequence_github_fetch
!theme plain
autonumber
skinparam BoxPadding 10
skinparam ParticipantPadding 15

title Sequence Diagram: Backend Fetching & Paginating Data from GitHub API

participant "FastAPI Service\\n(RevAudit Backend)" as Backend
participant "Requests Client\\n(HTTP Session)" as Client
participant "GitHub REST API v3\\n(/repos/{owner}/{repo}/pulls)" as GitHub

Backend -> Client : list_closed_pull_requests(owner, repo, state='closed')
activate Client

loop Pagination Loop (until sync timestamp, max pages, or no 'next' link)
    Client -> GitHub : GET /repos/{owner}/{repo}/pulls?state=closed&per_page=100&page={n}\\nHeaders: OAuth token, Accept, User-Agent
    activate GitHub

    alt HTTP 200 OK (Success)
        GitHub --> Client : 200 OK [PR_1, PR_2, ..., PR_k]\\nHeader: Link: <...page=n+1>; rel="next", X-RateLimit-Remaining: 58
        Client -> Client : Append page items to aggregated_prs list
    else HTTP 404 Not Found (Invalid Repo)
        GitHub --> Client : 404 Not Found {"message": "Not Found"}
        Client --> Backend : Raise HTTPException(404, "Repository not found")
    else HTTP 403 Forbidden (Rate Limit Exceeded)
        GitHub --> Client : 403 Forbidden {"message": "API rate limit exceeded"}
        Client --> Backend : Raise HTTPException(403, "GitHub API rate limit exceeded")
    end
    deactivate GitHub
end

Client --> Backend : Return aggregated PR JSON payload (bounded page limit)
deactivate Client

Backend -> Backend : Hand off raw PR list to Pandas Data Cleaning Engine
Backend -> GitHub : GET /pulls/{number}/reviews for merged PRs
GitHub --> Backend : Review events and reviewer timestamps

@enduml`
  },
  {
    id: '04_sequence_pandas_baseline',
    num: '04',
    title: 'Pandas Baseline Calculation & Anomaly Engine',
    type: 'Sequence Diagram',
    svgPath: `${import.meta.env.BASE_URL}diagrams/04_sequence_pandas_baseline.svg`,
    pumlPath: `${import.meta.env.BASE_URL}diagrams/04_sequence_pandas_baseline.puml`,
    fallbackSvg: `${import.meta.env.BASE_URL}diagrams/04_sequence_pandas_baseline.svg`,
    sourceFile: 'docs/diagrams/04_sequence_pandas_baseline.puml',
    description: 'Traces paginated ingestion, human review events, right-censoring, code scope, Kaplan–Meier estimates, bootstrap intervals, and robust adjusted triage.',
    puml: `@startuml sequence_pandas_baseline
!theme plain
autonumber
skinparam BoxPadding 10
skinparam ParticipantPadding 15

title Sequence Diagram: Pandas Engine Baseline Calculation & Anomaly Detection

participant "FastAPI Controller" as Controller
participant "Pandas Pipeline\\n(DataFrame Ops)" as Pandas
participant "Statistical Model\\n(Math Engine)" as Stats

Controller -> Pandas : process_and_audit(raw_prs_json)
activate Pandas

Pandas -> Pandas : df = pd.DataFrame(raw_prs_json)
Pandas -> Pandas : Keep open/closed PRs; derive review event or censor time

Pandas -> Pandas : time to first human review; censor when absent
Pandas -> Pandas : complexity = changed lines + changed files
Pandas -> Pandas : classify Small / Medium / Large / Unknown

Pandas -> Stats : compute_group_stats(df, groupby='size_category')
activate Stats

Stats -> Stats : Kaplan-Meier median per code scope cohort
Stats -> Stats : Bootstrap 95% interval when sample support permits
Stats --> Pandas : Return baseline_medians {Small, Medium, Large}
deactivate Stats

Pandas -> Stats : flag_anomalies(df, baseline_medians, multiplier=1.5)
activate Stats
loop For each merged PR in df
    Stats -> Stats : Huber robust regression of log first-review latency\\nFlag absolute robust residual z >= 2.5 for process triage
end
Stats --> Pandas : Return anomalies list (sorted desc by ratio)
deactivate Stats

Pandas --> Controller : Return final audit dictionary {totals, baselines, anomalies}
deactivate Pandas

@enduml`
  },
  {
    id: '05_sequence_pdf_export',
    num: '05',
    title: 'PDF Audit Report Compilation',
    type: 'Sequence Diagram',
    svgPath: `${import.meta.env.BASE_URL}diagrams/05_sequence_pdf_export.svg`,
    pumlPath: `${import.meta.env.BASE_URL}diagrams/05_sequence_pdf_export.puml`,
    fallbackSvg: `${import.meta.env.BASE_URL}diagrams/05_sequence_pdf_export.svg`,
    sourceFile: 'docs/diagrams/05_sequence_pdf_export.puml',
    description: 'Documents the implemented reporting pipeline: serialization of audit metrics, server-side PDF compilation with ReportLab, and binary stream download.',
    puml: `@startuml sequence_pdf_export
!theme plain
autonumber
skinparam BoxPadding 10
skinparam ParticipantPadding 15

title Sequence Diagram: User Exporting Flagged Analytics to PDF Report

actor "User / Review Lead" as User
participant "React Frontend\\n(Report Generator)" as Frontend
participant "FastAPI Backend\\n(/api/reports/pdf)" as Backend
participant "ReportLab / PDF Engine\\n(Document Renderer)" as PDFEngine

User -> Frontend : Click "Export Audit as PDF" button
activate Frontend

Frontend -> Frontend : Serialize current audit state\\n(repo, baselines, anomaly list, timestamp)

Frontend -> Backend : POST /api/reports/pdf\\n{owner, repo, baselines, workload, anomalies}
activate Backend

Backend -> Backend : Validate audit payload

Backend -> PDFEngine : build_audit_pdf(audit_payload)
activate PDFEngine

PDFEngine -> PDFEngine : Render Header & Executive Summary
PDFEngine -> PDFEngine : Build Size-Controlled Baseline Bar Charts
PDFEngine -> PDFEngine : Generate Anomaly Audit Matrix Table\\n(PR#, Author, Review Time, CI Margin)
PDFEngine -> PDFEngine : Compile PDF binary stream (application/pdf)

PDFEngine --> Backend : Return raw PDF byte buffer
deactivate PDFEngine

Backend --> Frontend : 200 OK (Content-Type: application/pdf, Content-Disposition: attachment)
deactivate Backend

Frontend -> Frontend : Create Blob URL & trigger browser download
Frontend --> User : Download "RevAudit_{owner}_{repo}_{date}.pdf"
deactivate Frontend

@enduml`
  },
  {
    id: '06_class_diagram',
    num: '06',
    title: 'RevAudit Domain Class Architecture',
    type: 'Class Diagram',
    svgPath: `${import.meta.env.BASE_URL}diagrams/06_class_diagram.svg`,
    pumlPath: `${import.meta.env.BASE_URL}diagrams/06_class_diagram.puml`,
    fallbackSvg: `${import.meta.env.BASE_URL}diagrams/06_class_diagram.svg`,
    sourceFile: 'docs/diagrams/06_class_diagram.puml',
    description: 'Defines the object-oriented domain model for User, Repository, PullRequest, ReviewEvent, and StatisticalModel with clean associations.',
    puml: `@startuml class_diagram
!theme plain
skinparam classAttributeIconSize 0
skinparam linetype ortho

title Class Diagram: RevAudit Domain Architecture

class User {
    +id: int
    +github_id: string
    +username: string
    +email: string
    +avatar_url: string
    +role: string
    +created_at: DateTime
    +get_assigned_prs(): List<PullRequest>
    +get_review_history(): List<ReviewEvent>
}

class Repository {
    +id: int
    +github_repo_id: string
    +owner: string
    +name: string
    +full_name: string
    +is_private: boolean
    +created_at: DateTime
    +last_audited_at: DateTime
    +fetch_closed_prs(limit: int): List<PullRequest>
    +compute_repo_health(): float
}

class PullRequest {
    +id: int
    +github_pr_id: string
    +number: int
    +title: string
    +body: string
    +body_length: int
    +author_id: int
    +state: string
    +is_merged: boolean
    +created_at: DateTime
    +merged_at: DateTime
    +closed_at: DateTime
    +review_time_hours: float
    +size_category: string
    +is_anomaly: boolean
    +anomaly_ratio: float
    +calculate_review_time(): float
    +categorize_size(): string
}

class ReviewEvent {
    +id: int
    +pr_id: int
    +reviewer_id: int
    +state: string
    +submitted_at: DateTime
    +body: string
    +time_to_review_hours: float
    +is_approving(): boolean
}

class StatisticalModel {
    +model_id: string
    +confidence_level: float
    +anomaly_multiplier: float
    +baseline_medians: Dict<string, float>
    +confidence_intervals: Dict<string, Tuple>
    +compute_size_baselines(prs: List<PullRequest>): Dict
    +calculate_confidence_interval(data: List<float>): Tuple
    +flag_anomalies(prs: List<PullRequest>): List<PullRequest>
}

' Relationships
User "1" -- "0..*" Repository : owns / audits >
Repository "1" *-- "0..*" PullRequest : contains >
User "1" -- "0..*" PullRequest : authors >
PullRequest "1" *-- "0..*" ReviewEvent : receives >
User "1" -- "0..*" ReviewEvent : submits >
StatisticalModel ..> PullRequest : analyzes & flags >
StatisticalModel ..> Repository : evaluates >

@enduml`
  }
];

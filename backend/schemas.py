from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class UserBase(BaseModel):
    login: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class RepositoryBase(BaseModel):
    owner: str
    name: str
    default_branch: Optional[str] = "main"
    last_synced_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnomalyItem(BaseModel):
    pr_number: int
    title: str
    author: str
    size_category: str
    body_length: int
    review_time_hours: float
    group_median_hours: float
    anomaly_ratio: float
    threshold_hours: float
    mock_ci_90: List[float]
    html_url: Optional[str] = None
    created_at: str
    merged_at: Optional[str] = None
    first_review_at: Optional[str] = None
    time_to_first_review_hours: Optional[float] = None
    reviewer_login: Optional[str] = None
    reviewer_workload: int = 0
    review_count: int = 0
    review_rounds: int = 0


class CohortBaseline(BaseModel):
    median_hours: float
    sample_size: int
    mock_ci_90: List[float]


class AuditResponse(BaseModel):
    owner: str
    repo: str
    total_closed_prs: int
    merged_prs_count: int
    unmerged_prs_dropped: int
    baseline_medians: Dict[str, CohortBaseline]
    anomalies_count: int
    anomalies: List[AnomalyItem]
    data_source: Optional[str] = "live"
    last_synced_at: Optional[str] = None
    workload_summary: Dict[str, Any] = Field(default_factory=dict)

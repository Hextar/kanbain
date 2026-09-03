from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ParsedMilestone:
    title: str
    due_at: datetime | None = None


@dataclass
class ParsedTask:
    title: str
    work_kind: str
    parent_index: int | None = None
    description: str | None = None
    estimate_tshirt: str | None = None
    estimate_points: int | None = None
    estimate_hours: float | None = None
    priority: str | None = None
    assignee: str | None = None
    due_at: datetime | None = None
    milestone: str | None = None
    depends_on: list[str] = field(default_factory=list)
    acceptance: list[str] = field(default_factory=list)


@dataclass
class ParsedPlan:
    title: str | None
    milestones: list[ParsedMilestone]
    tasks: list[ParsedTask]


@dataclass
class PlannerResult:
    prompt: str
    raw: str
    plan: ParsedPlan
    chunk_ids: list[str] = field(default_factory=list)
    pending_urls: list[str] = field(default_factory=list)
    domain_slug: str = ""

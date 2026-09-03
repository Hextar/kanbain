from __future__ import annotations

from datetime import datetime, timezone

from ..models import Project
from ..planner.schema import ParsedPlan


def evaluate_load(project: Project, plan: ParsedPlan) -> str | None:
    if project.deadline_kind == "ongoing" or project.deadline_at is None:
        return None
    capacities = [float(member.capacity) for member in project.members if member.capacity]
    if not capacities:
        return None
    hours = sum(
        task.estimate_hours or 0.0
        for task in plan.tasks
        if task.work_kind == "task"
    )
    if hours <= 0:
        return None
    now = datetime.now(timezone.utc)
    deadline = project.deadline_at
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    days = max(0.0, (deadline - now).total_seconds() / 86400)
    weeks = max(days / 7.0, 1 / 7)
    available = sum(capacities) * weeks
    if hours <= available:
        return None
    return (
        f"Plan load is {hours:.0f}h against about {available:.0f}h of team capacity "
        f"before the deadline. Cut scope, slip the date, or add capacity."
    )

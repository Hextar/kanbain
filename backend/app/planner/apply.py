from __future__ import annotations

from decimal import Decimal

from ..extensions import db
from ..models import Assignee, Milestone, Project, Task, TaskDependency
from ..serialize import utcnow
from .parse import parse_plan
from .schema import ParsedPlan


def apply_plan(project: Project, markdown: str) -> None:
    plan = parse_plan(markdown)
    _clear_board(project)
    milestone_ids = _write_milestones(project, plan)
    assignee_ids = _write_assignees(plan)
    column = min(project.columns, key=lambda item: item.order)
    now = utcnow()
    created: list[Task] = []

    for item in plan.tasks:
        parent_id = created[item.parent_index].id if item.parent_index is not None else None
        task = Task(
            project_id=project.id,
            column_id=column.id,
            title=item.title,
            work_kind=item.work_kind,
            parent_id=parent_id,
            description=item.description,
            acceptance_criteria=item.acceptance or None,
            estimate_tshirt=item.estimate_tshirt,
            estimate_points=item.estimate_points,
            estimate_hours=Decimal(str(item.estimate_hours)) if item.estimate_hours is not None else None,
            priority=item.priority,
            due_date=item.due_at,
            assignee_id=assignee_ids.get(_norm(item.assignee)) if item.assignee else None,
            milestone_id=milestone_ids.get(_norm(item.milestone)) if item.milestone else None,
            created_at=now,
        )
        db.session.add(task)
        db.session.flush()
        created.append(task)

    title_ids = {_norm(task.title): task.id for task in created}
    for item, task in zip(plan.tasks, created, strict=True):
        for dependency_title in item.depends_on:
            depends_on_id = title_ids.get(_norm(dependency_title))
            if depends_on_id and depends_on_id != task.id:
                task.dependencies.append(
                    TaskDependency(task_id=task.id, depends_on_id=depends_on_id)
                )

    project.plan_markdown = markdown
    project.plan_status = "ready"
    project.plan_error = None
    project.updated_at = now
    db.session.commit()


def _clear_board(project: Project) -> None:
    for task in list(project.tasks):
        db.session.delete(task)
    for milestone in list(project.milestones):
        db.session.delete(milestone)
    db.session.flush()


def _write_milestones(project: Project, plan: ParsedPlan) -> dict[str, str]:
    ids: dict[str, str] = {}
    for order, item in enumerate(plan.milestones):
        milestone = Milestone(
            project_id=project.id,
            title=item.title,
            due_at=item.due_at,
            order=order,
        )
        db.session.add(milestone)
        db.session.flush()
        ids[_norm(item.title)] = milestone.id
    return ids


def _write_assignees(plan: ParsedPlan) -> dict[str, str]:
    names = []
    seen: set[str] = set()
    for task in plan.tasks:
        if not task.assignee:
            continue
        key = _norm(task.assignee)
        if key in seen:
            continue
        seen.add(key)
        names.append(task.assignee)

    ids: dict[str, str] = {}
    for name in names:
        existing = db.session.scalar(db.select(Assignee).where(Assignee.name == name))
        if existing is None:
            existing = Assignee(name=name)
            db.session.add(existing)
            db.session.flush()
        ids[_norm(name)] = existing.id
    return ids


def _norm(value: str | None) -> str:
    return (value or "").strip().lower()

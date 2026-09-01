from __future__ import annotations

from decimal import Decimal

from ..extensions import db
from ..models import Assignee, Milestone, Project, Task, TaskDependency
from ..serialize import utcnow
from .schema import ParsedPlan, ParsedTask


def apply_plan(project: Project, plan: ParsedPlan, *, raw: str) -> list[str]:
    _clear_board(project)
    actions: list[str] = []
    milestone_ids = _write_milestones(project, plan, actions)
    assignee_ids = _write_assignees(plan, actions)
    column = min(project.columns, key=lambda item: item.order)
    now = utcnow()
    created: list[Task] = []

    first_milestone_id = next(iter(milestone_ids.values()), None)
    for item in plan.tasks:
        parent = created[item.parent_index] if item.parent_index is not None else None
        milestone_id = milestone_ids.get(_norm(item.milestone)) if item.milestone else None
        if milestone_id is None and parent is not None:
            milestone_id = parent.milestone_id
        if milestone_id is None:
            milestone_id = first_milestone_id
        task = Task(
            project_id=project.id,
            column_id=column.id,
            title=item.title,
            order=len(created),
            number=len(created) + 1,
            work_kind=item.work_kind,
            parent_id=parent.id if parent is not None else None,
            description=item.description,
            acceptance_criteria=item.acceptance or None,
            estimate_tshirt=item.estimate_tshirt,
            estimate_points=item.estimate_points,
            estimate_hours=Decimal(str(item.estimate_hours)) if item.estimate_hours is not None else None,
            priority=item.priority,
            due_date=item.due_at,
            assignee_id=assignee_ids.get(_norm(item.assignee)) if item.assignee else None,
            milestone_id=milestone_id,
            created_at=now,
        )
        db.session.add(task)
        db.session.flush()
        created.append(task)
        actions.append(_task_action(item, parent.title if parent is not None else ""))

    title_ids = {_norm(task.title): task.id for task in created}
    for item, task in zip(plan.tasks, created, strict=True):
        for dependency_title in item.depends_on:
            depends_on_id = title_ids.get(_norm(dependency_title))
            if depends_on_id and depends_on_id != task.id:
                task.dependencies.append(
                    TaskDependency(task_id=task.id, depends_on_id=depends_on_id)
                )
                actions.append(f"set_depends title={task.title} depends_on={dependency_title}")

    project.plan_markdown = raw
    project.plan_status = "ready"
    project.plan_error = None
    project.plan_phase = None
    project.updated_at = now
    db.session.commit()
    return actions


def _clear_board(project: Project) -> None:
    for task in list(project.tasks):
        db.session.delete(task)
    for milestone in list(project.milestones):
        db.session.delete(milestone)
    db.session.flush()


def _write_milestones(project: Project, plan: ParsedPlan, actions: list[str]) -> dict[str, str]:
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
        due = item.due_at.date().isoformat() if item.due_at else ""
        actions.append(f"create_milestone title={item.title} due={due}")
    return ids


def _write_assignees(plan: ParsedPlan, actions: list[str]) -> dict[str, str]:
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
            actions.append(f"create_assignee name={name}")
        ids[_norm(name)] = existing.id
    return ids


def _task_action(item: ParsedTask, parent_title: str) -> str:
    estimate_parts: list[str] = []
    if item.estimate_tshirt:
        estimate_parts.append(item.estimate_tshirt.upper())
    if item.estimate_points is not None:
        estimate_parts.append(str(item.estimate_points))
    if item.estimate_hours is not None:
        estimate_parts.append(f"{item.estimate_hours:g}h")
    due = item.due_at.date().isoformat() if item.due_at else ""
    return (
        f"create_task title={item.title} kind={item.work_kind} parent={parent_title} "
        f"assignee={item.assignee or ''} priority={item.priority or ''} "
        f"estimate={'|'.join(estimate_parts)} milestone={item.milestone or ''} "
        f"due={due} depends={','.join(item.depends_on)} "
        f"acceptance={'; '.join(item.acceptance)}"
    )


def _norm(value: str | None) -> str:
    return (value or "").strip().lower()

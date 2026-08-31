from flask import Blueprint, jsonify, request
from sqlalchemy import func

from ..extensions import db
from ..http import error_response
from ..lookups import (
    UnknownEntityError,
    get_assignee,
    get_column,
    get_milestone,
    get_tags_by_names,
    get_task,
    resolve_project_id,
)
from ..models import BoardColumn, Task, TaskDependency, new_id
from ..serialize import parse_datetime, utcnow
from ..validation import (
    TSHIRTS,
    WORK_KINDS,
    json_error,
    parse_enum,
    parse_int,
    parse_number,
    parse_optional_id,
    parse_optional_text,
    parse_priority,
    parse_string_list,
    require_title,
)

tasks_bp = Blueprint("tasks", __name__)


def _replace_dependencies(task: Task, depends_on_ids: list[str]) -> None:
    unique_ids = []
    seen = set()
    for depends_on_id in depends_on_ids:
        if depends_on_id == task.id:
            raise ValueError("a task cannot depend on itself")
        if depends_on_id in seen:
            continue
        seen.add(depends_on_id)
        unique_ids.append(depends_on_id)

    dependency_tasks = []
    for depends_on_id in unique_ids:
        try:
            dependency_tasks.append(get_task(depends_on_id))
        except UnknownEntityError as exc:
            raise LookupError(str(exc)) from exc

    for dependency in dependency_tasks:
        if dependency.project_id != task.project_id:
            raise ValueError("dependsOn must be in the same project")

    task.dependencies.clear()
    for depends_on_id in unique_ids:
        task.dependencies.append(TaskDependency(task_id=task.id, depends_on_id=depends_on_id))


def _apply_task_fields(task: Task, payload: dict, *, creating: bool) -> None:
    source_column_id = None if creating else task.column_id

    if "title" in payload or creating:
        task.title = require_title(payload)

    column_id = payload.get("columnId")
    if creating or "columnId" in payload:
        if not isinstance(column_id, str) or not column_id:
            raise ValueError("columnId is required")
        column = get_column(column_id)
        if task.project_id and column.project_id != task.project_id:
            raise ValueError("columnId must belong to the same project")
        task.column_id = column.id
        task.project_id = column.project_id

    if creating and not task.project_id:
        raise ValueError("columnId is required")

    if "projectId" in payload:
        project_id = parse_optional_id(payload.get("projectId"), "projectId")
        if project_id and project_id != task.project_id:
            raise ValueError("projectId does not match the column's project")

    if creating or "workKind" in payload:
        work_kind = parse_enum(payload.get("workKind"), WORK_KINDS, "workKind")
        if work_kind:
            task.work_kind = work_kind
        elif creating:
            task.work_kind = "task"

    if "parentId" in payload:
        parent_id = parse_optional_id(payload.get("parentId"), "parentId")
        _set_parent(task, parent_id)

    if creating:
        task.number = _next_task_number(task.project_id)

    if "description" in payload:
        task.description = parse_optional_text(payload.get("description"), "description")

    if "acceptanceCriteria" in payload:
        task.acceptance_criteria = parse_string_list(
            payload.get("acceptanceCriteria"), "acceptanceCriteria"
        )

    if "priority" in payload:
        task.priority = parse_priority(payload.get("priority"))

    if "category" in payload:
        task.category = parse_optional_text(payload.get("category"), "category")

    if "estimateTshirt" in payload:
        task.estimate_tshirt = parse_enum(payload.get("estimateTshirt"), TSHIRTS, "estimateTshirt")
    if "estimatePoints" in payload:
        task.estimate_points = parse_int(payload.get("estimatePoints"), "estimatePoints")
    if "estimateHours" in payload:
        task.estimate_hours = parse_number(payload.get("estimateHours"), "estimateHours")

    if "assigneeId" in payload:
        assignee_id = parse_optional_id(payload.get("assigneeId"), "assigneeId")
        if assignee_id is None:
            task.assignee_id = None
        else:
            get_assignee(assignee_id)
            task.assignee_id = assignee_id

    if "milestoneId" in payload:
        milestone_id = parse_optional_id(payload.get("milestoneId"), "milestoneId")
        if milestone_id is None:
            task.milestone_id = None
        else:
            milestone = get_milestone(milestone_id)
            if milestone.project_id != task.project_id:
                raise ValueError("milestoneId must belong to the same project")
            task.milestone_id = milestone_id

    if "tags" in payload:
        tags = parse_string_list(payload.get("tags"), "tags")
        if tags is None:
            task.tags = None
        else:
            # Deduplicate while preserving order; names must exist in the catalog.
            unique_tags = list(dict.fromkeys(tag.strip() for tag in tags if tag.strip()))
            get_tags_by_names(unique_tags)
            task.tags = unique_tags or None
    if "attachments" in payload:
        task.attachments = parse_string_list(payload.get("attachments"), "attachments")
    if "comments" in payload:
        task.comments = parse_string_list(payload.get("comments"), "comments")

    if "dueDate" in payload:
        task.due_date = parse_datetime(payload.get("dueDate"))
    if "createdAt" in payload:
        task.created_at = parse_datetime(payload.get("createdAt"))
    if "updatedAt" in payload:
        task.updated_at = parse_datetime(payload.get("updatedAt"))

    if "dependsOn" in payload:
        depends_on = parse_string_list(payload.get("dependsOn"), "dependsOn")
        _replace_dependencies(task, depends_on or [])

    column_changed = not creating and source_column_id != task.column_id
    if creating or "order" in payload or column_changed:
        order = parse_int(payload.get("order"), "order") if "order" in payload else None
        _place_task(
            task,
            task.column_id,
            order,
            source_column_id=source_column_id,
        )
        if column_changed:
            _bring_same_column_children(task, source_column_id)
            _maybe_complete_ancestors(task)


def _task_fingerprint(task: Task) -> dict:
    payload = task.to_dict()
    payload.pop("updatedAt", None)
    return payload


def _column_tasks(column_id: str, *, exclude_id: str | None = None) -> list[Task]:
    statement = (
        db.select(Task)
        .where(Task.column_id == column_id)
        .order_by(Task.order.asc(), Task.id.asc())
    )
    if exclude_id is not None:
        statement = statement.where(Task.id != exclude_id)
    return db.session.execute(statement).scalars().all()


def _renumber_column(column_id: str) -> None:
    for index, sibling in enumerate(_column_tasks(column_id)):
        sibling.order = index


def _place_task(
    task: Task,
    column_id: str,
    order: int | None,
    *,
    source_column_id: str | None,
) -> None:
    siblings = _column_tasks(column_id, exclude_id=task.id)
    insert_at = len(siblings) if order is None else max(0, min(order, len(siblings)))
    siblings.insert(insert_at, task)
    task.column_id = column_id
    for index, sibling in enumerate(siblings):
        sibling.order = index
    if source_column_id and source_column_id != column_id:
        _renumber_column(source_column_id)


def _bring_same_column_children(task: Task, source_column_id: str | None) -> None:
    if not source_column_id or source_column_id == task.column_id:
        return
    for child in list(_child_tasks(task.id)):
        if child.column_id != source_column_id:
            continue
        _place_task(child, task.column_id, None, source_column_id=source_column_id)
        _bring_same_column_children(child, source_column_id)


def _last_column_id(project_id: str) -> str | None:
    column = db.session.execute(
        db.select(BoardColumn)
        .where(BoardColumn.project_id == project_id)
        .order_by(BoardColumn.order.desc())
        .limit(1)
    ).scalar_one_or_none()
    return column.id if column is not None else None


def _child_tasks(parent_id: str, *, exclude_id: str | None = None) -> list[Task]:
    statement = db.select(Task).where(Task.parent_id == parent_id)
    if exclude_id is not None:
        statement = statement.where(Task.id != exclude_id)
    return list(db.session.scalars(statement))


def _next_task_number(project_id: str) -> int:
    current = db.session.scalar(
        db.select(func.max(Task.number)).where(Task.project_id == project_id)
    )
    return (current or 0) + 1


def _set_parent(task: Task, parent_id: str | None) -> None:
    previous_parent_id = task.parent_id
    if parent_id is None:
        task.parent_id = None
        if task.work_kind != "epic" and not _child_tasks(task.id):
            task.work_kind = "task"
        _maybe_demote_parent(previous_parent_id, exclude_id=task.id)
        return

    if parent_id == task.id:
        raise ValueError("a task cannot be its own parent")

    parent = get_task(parent_id)
    if parent.project_id != task.project_id:
        raise ValueError("parentId must belong to the same project")
    _assert_can_nest(task, parent)
    task.parent_id = parent.id
    if parent.work_kind == "epic":
        task.work_kind = "story"
    else:
        if parent.work_kind == "task" and parent.parent_id is None:
            parent.work_kind = "story"
        task.work_kind = "task"
    if previous_parent_id and previous_parent_id != parent.id:
        _maybe_demote_parent(previous_parent_id, exclude_id=task.id)


def _assert_can_nest(task: Task, parent: Task) -> None:
    cursor = parent
    seen: set[str] = set()
    while cursor is not None:
        if cursor.id == task.id:
            raise ValueError("a task cannot be nested under its descendant")
        if cursor.id in seen:
            break
        seen.add(cursor.id)
        cursor = cursor.parent

    if task.work_kind == "epic":
        raise ValueError("an epic cannot be nested")
    if parent.work_kind == "task" and parent.parent_id:
        raise ValueError("cannot nest under a subtask")
    if parent.work_kind != "epic" and _child_tasks(task.id):
        raise ValueError("a card with subtasks can only nest under an epic")


def _maybe_demote_parent(parent_id: str | None, *, exclude_id: str) -> None:
    if not parent_id:
        return
    parent = db.session.get(Task, parent_id)
    if parent is None or parent.work_kind != "story":
        return
    if not _child_tasks(parent.id, exclude_id=exclude_id):
        parent.work_kind = "task"


def _maybe_complete_ancestors(task: Task) -> None:
    parent = task.parent
    if parent is None:
        return
    last_id = _last_column_id(task.project_id)
    if last_id is None:
        return
    children = _child_tasks(parent.id)
    if not children or any(child.column_id != last_id for child in children):
        return
    if parent.column_id != last_id:
        _place_task(parent, last_id, None, source_column_id=parent.column_id)
    _maybe_complete_ancestors(parent)


def _task_filters():
    column_id = request.args.get("columnId")
    category = request.args.get("category")
    priority = request.args.get("priority")
    work_kind = request.args.get("workKind")

    if column_id:
        column = get_column(column_id)
        project_id = column.project_id
        explicit = parse_optional_id(request.args.get("projectId"), "projectId")
        if explicit and explicit != project_id:
            raise ValueError("projectId does not match the column's project")
    else:
        project_id = resolve_project_id(request.args.get("projectId"))

    statement = db.select(Task).where(Task.project_id == project_id)
    if column_id:
        statement = statement.where(Task.column_id == column_id)
    if category:
        statement = statement.where(Task.category == category)
    if priority:
        parsed = parse_priority(priority)
        if parsed is None:
            raise ValueError("priority must be low, medium, or high")
        statement = statement.where(Task.priority == parsed)
    if work_kind:
        parsed_kind = parse_enum(work_kind, WORK_KINDS, "workKind", required=True)
        statement = statement.where(Task.work_kind == parsed_kind)
    return statement.order_by(Task.column_id.asc(), Task.order.asc(), Task.id.asc())


@tasks_bp.get("/api/tasks")
def list_tasks():
    try:
        statement = _task_filters()
    except UnknownEntityError as exc:
        return error_response(str(exc), 400)
    except ValueError as exc:
        return json_error(exc)
    tasks = db.session.execute(statement).scalars()
    return jsonify([task.to_dict() for task in tasks])


@tasks_bp.get("/api/tasks/<task_id>")
def get_task_route(task_id: str):
    try:
        task = get_task(task_id)
    except UnknownEntityError as exc:
        return error_response(str(exc), 404)
    return jsonify(task.to_dict())


@tasks_bp.post("/api/tasks")
def create_task():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)

    try:
        task_id = parse_optional_id(payload.get("id"))
    except ValueError as exc:
        return json_error(exc)

    if task_id and db.session.get(Task, task_id):
        return error_response(f"Task {task_id} already exists", 409)

    task = Task(created_at=utcnow(), work_kind="task")
    task.id = task_id or new_id()
    try:
        _apply_task_fields(task, payload, creating=True)
    except UnknownEntityError as exc:
        message = str(exc)
        status = 404 if message.startswith("Task ") else 400
        return error_response(message, status)
    except LookupError as exc:
        return error_response(str(exc), 400)
    except ValueError as exc:
        return json_error(exc)

    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@tasks_bp.put("/api/tasks/<task_id>")
def update_task(task_id: str):
    try:
        task = get_task(task_id)
    except UnknownEntityError as exc:
        return error_response(str(exc), 404)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)

    previous_updated_at = task.updated_at
    before = _task_fingerprint(task)
    try:
        _apply_task_fields(task, payload, creating=False)
    except UnknownEntityError as exc:
        message = str(exc)
        status = 404 if message.startswith("Task ") else 400
        return error_response(message, status)
    except LookupError as exc:
        return error_response(str(exc), 400)
    except ValueError as exc:
        return json_error(exc)

    if _task_fingerprint(task) != before:
        task.updated_at = utcnow()
    else:
        task.updated_at = previous_updated_at
    db.session.commit()
    return jsonify(task.to_dict())


@tasks_bp.delete("/api/tasks/<task_id>")
def delete_task(task_id: str):
    task = db.session.get(Task, task_id)
    if task is not None:
        db.session.delete(task)
        db.session.commit()
    return ("", 204)

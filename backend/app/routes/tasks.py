from flask import Blueprint, jsonify, request

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
from ..models import Task, TaskDependency, new_id
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
    column_in_payload = "columnId" in payload

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

    if "parentId" in payload:
        parent_id = parse_optional_id(payload.get("parentId"), "parentId")
        if parent_id is None:
            task.parent_id = None
        elif parent_id == task.id:
            raise ValueError("a task cannot be its own parent")
        else:
            parent = get_task(parent_id)
            if parent.project_id != task.project_id:
                raise ValueError("parentId must belong to the same project")
            task.parent_id = parent_id

    if creating or "workKind" in payload:
        work_kind = parse_enum(payload.get("workKind"), WORK_KINDS, "workKind")
        task.work_kind = work_kind or "task"

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

    _apply_task_order(
        task,
        payload,
        creating=creating,
        source_column_id=source_column_id,
        column_in_payload=column_in_payload,
    )


def _next_column_order(column_id: str) -> int:
    max_order = db.session.scalar(
        db.select(db.func.max(Task.order)).where(Task.column_id == column_id)
    )
    return (max_order if max_order is not None else -1) + 1


def _renumber_column(column_id: str) -> None:
    siblings = db.session.execute(
        db.select(Task)
        .where(Task.column_id == column_id)
        .order_by(Task.order.asc(), Task.id.asc())
    ).scalars().all()
    for index, sibling in enumerate(siblings):
        sibling.order = index


def _place_task(
    task: Task,
    column_id: str,
    order: int | None,
    *,
    source_column_id: str | None,
) -> None:
    siblings = (
        db.session.execute(
            db.select(Task)
            .where(Task.column_id == column_id, Task.id != task.id)
            .order_by(Task.order.asc(), Task.id.asc())
        )
        .scalars()
        .all()
    )
    insert_at = len(siblings) if order is None else max(0, min(order, len(siblings)))
    siblings.insert(insert_at, task)
    task.column_id = column_id
    for index, sibling in enumerate(siblings):
        sibling.order = index
    if source_column_id and source_column_id != column_id:
        _renumber_column(source_column_id)


def _apply_task_order(
    task: Task,
    payload: dict,
    *,
    creating: bool,
    source_column_id: str | None,
    column_in_payload: bool,
) -> None:
    order_in_payload = "order" in payload
    if creating and not order_in_payload:
        task.order = _next_column_order(task.column_id)
        return
    if creating or order_in_payload or column_in_payload:
        order = parse_int(payload.get("order"), "order") if order_in_payload else None
        _place_task(
            task,
            task.column_id,
            order,
            source_column_id=source_column_id,
        )


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

    task.updated_at = utcnow()
    db.session.commit()
    return jsonify(task.to_dict())


@tasks_bp.delete("/api/tasks/<task_id>")
def delete_task(task_id: str):
    task = db.session.get(Task, task_id)
    if task is not None:
        db.session.delete(task)
        db.session.commit()
    return ("", 204)

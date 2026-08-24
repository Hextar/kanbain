from flask import Blueprint, jsonify, request

from ..extensions import db
from ..http import error_response
from ..models import BoardColumn, Task
from ..serialize import parse_datetime, utcnow
from ..validation import json_error, parse_optional_id, parse_priority, require_title

tasks_bp = Blueprint("tasks", __name__)


def _apply_task_fields(task: Task, payload: dict, *, creating: bool) -> None:
    if "title" in payload or creating:
        task.title = require_title(payload)

    column_id = payload.get("columnId")
    if creating or "columnId" in payload:
        if not isinstance(column_id, str) or not column_id:
            raise ValueError("columnId is required")
        if db.session.get(BoardColumn, column_id) is None:
            raise LookupError("Unknown column")
        task.column_id = column_id

    if "description" in payload:
        description = payload.get("description")
        if description is not None and not isinstance(description, str):
            raise ValueError("description must be a string")
        task.description = description

    if "priority" in payload:
        task.priority = parse_priority(payload.get("priority"))

    if "category" in payload:
        category = payload.get("category")
        if category is not None and not isinstance(category, str):
            raise ValueError("category must be a string")
        task.category = category

    if "tags" in payload:
        task.tags = _string_list(payload.get("tags"), "tags")
    if "attachments" in payload:
        task.attachments = _string_list(payload.get("attachments"), "attachments")
    if "comments" in payload:
        task.comments = _string_list(payload.get("comments"), "comments")

    if "dueDate" in payload:
        task.due_date = parse_datetime(payload.get("dueDate"))
    if "createdAt" in payload:
        task.created_at = parse_datetime(payload.get("createdAt"))
    if "updatedAt" in payload:
        task.updated_at = parse_datetime(payload.get("updatedAt"))


def _string_list(value: object, field: str) -> list[str] | None:
    if value is None:
        return None
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise ValueError(f"{field} must be an array of strings")
    return value


def _task_filters():
    statement = db.select(Task)
    column_id = request.args.get("columnId")
    category = request.args.get("category")
    priority = request.args.get("priority")

    if column_id:
        statement = statement.where(Task.column_id == column_id)
    if category:
        statement = statement.where(Task.category == category)
    if priority:
        if priority not in {"low", "medium", "high"}:
            raise ValueError("priority must be low, medium, or high")
        statement = statement.where(Task.priority == priority)
    return statement


@tasks_bp.get("/api/tasks")
def list_tasks():
    try:
        statement = _task_filters()
    except ValueError as exc:
        return json_error(exc)
    tasks = db.session.execute(statement).scalars()
    return jsonify([task.to_dict() for task in tasks])


@tasks_bp.get("/api/tasks/<task_id>")
def get_task(task_id: str):
    task = db.session.get(Task, task_id)
    if task is None:
        return error_response(f"Task {task_id} not found", 404)
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

    task = Task(created_at=utcnow())
    if task_id:
        task.id = task_id
    try:
        _apply_task_fields(task, payload, creating=True)
    except LookupError as exc:
        return error_response(str(exc), 400)
    except ValueError as exc:
        return json_error(exc)

    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@tasks_bp.put("/api/tasks/<task_id>")
def update_task(task_id: str):
    task = db.session.get(Task, task_id)
    if task is None:
        return error_response(f"Task {task_id} not found", 404)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)

    try:
        _apply_task_fields(task, payload, creating=False)
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

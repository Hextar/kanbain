from flask import Blueprint, jsonify, request

from ..extensions import db
from ..http import error_response
from ..lookups import UnknownEntityError, get_column, resolve_project_id
from ..models import BoardColumn
from ..validation import (
    default_column_color,
    json_error,
    parse_column_color,
    parse_int,
    parse_optional_id,
    require_title,
)

columns_bp = Blueprint("columns", __name__)


@columns_bp.get("/api/columns")
def list_columns():
    try:
        project_id = resolve_project_id(request.args.get("projectId"))
    except UnknownEntityError as exc:
        return error_response(str(exc), 400)
    except ValueError as exc:
        return json_error(exc)

    columns = db.session.execute(
        db.select(BoardColumn)
        .where(BoardColumn.project_id == project_id)
        .order_by(BoardColumn.order.asc())
    ).scalars()
    return jsonify([column.to_dict() for column in columns])


@columns_bp.post("/api/columns")
def create_column():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)

    try:
        title = require_title(payload)
        column_id = parse_optional_id(payload.get("id"))
        project_id = resolve_project_id(payload.get("projectId") or request.args.get("projectId"))
        color = parse_column_color(payload.get("color")) if "color" in payload else None
    except UnknownEntityError as exc:
        return error_response(str(exc), 400)
    except ValueError as exc:
        return json_error(exc)

    if column_id and db.session.get(BoardColumn, column_id):
        return error_response(f"Column {column_id} already exists", 409)

    max_order = db.session.scalar(
        db.select(db.func.max(BoardColumn.order)).where(BoardColumn.project_id == project_id)
    )
    order = (max_order if max_order is not None else -1) + 1
    column = BoardColumn(
        project_id=project_id,
        title=title,
        order=order,
        color=color or default_column_color(order),
    )
    if column_id:
        column.id = column_id
    db.session.add(column)
    db.session.commit()
    return jsonify(column.to_dict()), 201


@columns_bp.put("/api/columns/<column_id>")
def update_column(column_id: str):
    try:
        column = get_column(column_id)
    except UnknownEntityError as exc:
        return error_response(str(exc), 404)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)

    try:
        if "title" in payload:
            column.title = require_title(payload)
        if "color" in payload:
            color = parse_column_color(payload.get("color"))
            if color is None:
                raise ValueError("color is required")
            column.color = color
        if "order" in payload:
            order = parse_int(payload.get("order"), "order")
            if order is None:
                raise ValueError("order must be an integer")
            _place_column(column, order)
    except ValueError as exc:
        return json_error(exc)

    db.session.commit()
    return jsonify(column.to_dict())


@columns_bp.delete("/api/columns/<column_id>")
def delete_column(column_id: str):
    column = db.session.get(BoardColumn, column_id)
    if column is not None:
        db.session.delete(column)
        db.session.commit()
    return ("", 204)


def _project_columns(project_id: str, *, exclude_id: str | None = None) -> list[BoardColumn]:
    statement = (
        db.select(BoardColumn)
        .where(BoardColumn.project_id == project_id)
        .order_by(BoardColumn.order.asc())
    )
    if exclude_id is not None:
        statement = statement.where(BoardColumn.id != exclude_id)
    return db.session.execute(statement).scalars().all()


def _place_column(column: BoardColumn, order: int | None) -> None:
    siblings = _project_columns(column.project_id, exclude_id=column.id)
    insert_at = len(siblings) if order is None else max(0, min(order, len(siblings)))
    siblings.insert(insert_at, column)
    for index, sibling in enumerate(siblings):
        sibling.order = index

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..http import error_response
from ..lookups import UnknownEntityError, resolve_project_id
from ..models import BoardColumn
from ..validation import json_error, parse_optional_id, require_title

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
    except UnknownEntityError as exc:
        return error_response(str(exc), 400)
    except ValueError as exc:
        return json_error(exc)

    if column_id and db.session.get(BoardColumn, column_id):
        return error_response(f"Column {column_id} already exists", 409)

    max_order = db.session.scalar(
        db.select(db.func.max(BoardColumn.order)).where(BoardColumn.project_id == project_id)
    )
    column = BoardColumn(
        project_id=project_id,
        title=title,
        order=(max_order if max_order is not None else -1) + 1,
    )
    if column_id:
        column.id = column_id
    db.session.add(column)
    db.session.commit()
    return jsonify(column.to_dict()), 201

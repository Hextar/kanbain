from flask import Blueprint, jsonify, request

from ..extensions import db
from ..http import error_response
from ..models import BoardColumn
from ..validation import json_error, parse_optional_id, require_title

columns_bp = Blueprint("columns", __name__)


@columns_bp.get("/api/columns")
def list_columns():
    columns = db.session.execute(
        db.select(BoardColumn).order_by(BoardColumn.order.asc())
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
    except ValueError as exc:
        return json_error(exc)

    if column_id and db.session.get(BoardColumn, column_id):
        return error_response(f"Column {column_id} already exists", 409)

    max_order = db.session.scalar(db.select(db.func.max(BoardColumn.order)))
    column = BoardColumn(
        title=title,
        order=(max_order if max_order is not None else -1) + 1,
    )
    if column_id:
        column.id = column_id
    db.session.add(column)
    db.session.commit()
    return jsonify(column.to_dict()), 201

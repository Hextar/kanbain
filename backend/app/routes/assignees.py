from flask import Blueprint, jsonify, request

from ..extensions import db
from ..http import error_response
from ..models import Assignee
from ..validation import json_error, parse_optional_id, require_text

assignees_bp = Blueprint("assignees", __name__)


@assignees_bp.get("/api/assignees")
def list_assignees():
    assignees = db.session.execute(db.select(Assignee).order_by(Assignee.name.asc())).scalars()
    return jsonify([assignee.to_dict() for assignee in assignees])


@assignees_bp.post("/api/assignees")
def create_assignee():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)

    try:
        assignee_id = parse_optional_id(payload.get("id"))
        name = require_text(payload, "name")
    except ValueError as exc:
        return json_error(exc)

    if assignee_id and db.session.get(Assignee, assignee_id):
        return error_response(f"Assignee {assignee_id} already exists", 409)

    existing = db.session.scalar(db.select(Assignee).where(Assignee.name == name))
    if existing is not None:
        return error_response(f"Assignee '{name}' already exists", 409)

    assignee = Assignee(name=name)
    if assignee_id:
        assignee.id = assignee_id
    db.session.add(assignee)
    db.session.commit()
    return jsonify(assignee.to_dict()), 201

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..http import error_response
from ..lookups import UnknownEntityError, get_milestone, get_project
from ..models import Milestone
from ..serialize import parse_datetime
from ..validation import json_error, parse_int, parse_optional_id, require_title

milestones_bp = Blueprint("milestones", __name__)


def _apply_milestone_fields(milestone: Milestone, payload: dict, *, creating: bool) -> None:
    if creating or "title" in payload:
        milestone.title = require_title(payload)
    if "dueAt" in payload:
        milestone.due_at = parse_datetime(payload.get("dueAt"))
    if "order" in payload:
        order = parse_int(payload.get("order"), "order")
        if order is None:
            raise ValueError("order must be an integer")
        milestone.order = order


@milestones_bp.get("/api/projects/<project_id>/milestones")
def list_milestones(project_id: str):
    try:
        get_project(project_id)
    except UnknownEntityError as exc:
        return error_response(str(exc), 404)
    milestones = db.session.execute(
        db.select(Milestone)
        .where(Milestone.project_id == project_id)
        .order_by(Milestone.order.asc())
    ).scalars()
    return jsonify([milestone.to_dict() for milestone in milestones])


@milestones_bp.post("/api/projects/<project_id>/milestones")
def create_milestone(project_id: str):
    try:
        get_project(project_id)
    except UnknownEntityError as exc:
        return error_response(str(exc), 404)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)

    try:
        milestone_id = parse_optional_id(payload.get("id"))
        max_order = db.session.scalar(
            db.select(db.func.max(Milestone.order)).where(Milestone.project_id == project_id)
        )
        milestone = Milestone(
            project_id=project_id,
            order=(max_order if max_order is not None else -1) + 1,
        )
        if milestone_id:
            milestone.id = milestone_id
        _apply_milestone_fields(milestone, payload, creating=True)
    except ValueError as exc:
        return json_error(exc)

    if milestone.id and db.session.get(Milestone, milestone.id):
        return error_response(f"Milestone {milestone.id} already exists", 409)

    db.session.add(milestone)
    db.session.commit()
    return jsonify(milestone.to_dict()), 201


@milestones_bp.put("/api/projects/<project_id>/milestones/<milestone_id>")
def update_milestone(project_id: str, milestone_id: str):
    try:
        get_project(project_id)
        milestone = get_milestone(milestone_id)
    except UnknownEntityError as exc:
        return error_response(str(exc), 404)
    if milestone.project_id != project_id:
        return error_response("Unknown milestone", 404)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)

    try:
        _apply_milestone_fields(milestone, payload, creating=False)
    except ValueError as exc:
        return json_error(exc)

    db.session.commit()
    return jsonify(milestone.to_dict())


@milestones_bp.delete("/api/projects/<project_id>/milestones/<milestone_id>")
def delete_milestone(project_id: str, milestone_id: str):
    try:
        milestone = get_milestone(milestone_id)
    except UnknownEntityError:
        return ("", 204)
    if milestone.project_id != project_id:
        return ("", 204)
    db.session.delete(milestone)
    db.session.commit()
    return ("", 204)

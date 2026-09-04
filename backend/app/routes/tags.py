from flask import Blueprint, jsonify, request

from ..extensions import db
from ..http import error_response
from ..identity import request_organization_id
from ..models import Tag
from ..validation import json_error, parse_optional_id, require_text

tags_bp = Blueprint("tags", __name__)


@tags_bp.get("/api/tags")
def list_tags():
    org_id = request_organization_id()
    statement = db.select(Tag).order_by(Tag.name.asc())
    if org_id is not None:
        statement = statement.where(Tag.organization_id == org_id)
    tags = db.session.execute(statement).scalars()
    return jsonify([tag.to_dict() for tag in tags])


@tags_bp.post("/api/tags")
def create_tag():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)

    try:
        tag_id = parse_optional_id(payload.get("id"))
        name = require_text(payload, "name")
    except ValueError as exc:
        return json_error(exc)

    org_id = request_organization_id()
    if not org_id:
        return error_response("Unauthorized", 401)

    if tag_id and db.session.get(Tag, tag_id):
        return error_response(f"Tag {tag_id} already exists", 409)

    existing = db.session.scalar(
        db.select(Tag).where(Tag.organization_id == org_id, Tag.name == name)
    )
    if existing is not None:
        return error_response(f"Tag '{name}' already exists", 409)

    tag = Tag(name=name, organization_id=org_id)
    if tag_id:
        tag.id = tag_id
    db.session.add(tag)
    db.session.commit()
    return jsonify(tag.to_dict()), 201

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..http import error_response
from ..models import Tag
from ..validation import json_error, parse_optional_id, require_text

tags_bp = Blueprint("tags", __name__)


@tags_bp.get("/api/tags")
def list_tags():
    tags = db.session.execute(db.select(Tag).order_by(Tag.name.asc())).scalars()
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

    if tag_id and db.session.get(Tag, tag_id):
        return error_response(f"Tag {tag_id} already exists", 409)

    existing = db.session.scalar(db.select(Tag).where(Tag.name == name))
    if existing is not None:
        return error_response(f"Tag '{name}' already exists", 409)

    tag = Tag(name=name)
    if tag_id:
        tag.id = tag_id
    db.session.add(tag)
    db.session.commit()
    return jsonify(tag.to_dict()), 201

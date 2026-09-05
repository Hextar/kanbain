from flask import Blueprint, jsonify
from sqlalchemy import text

from ..extensions import db, limiter

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
@limiter.exempt
def health():
    db.session.execute(text("SELECT 1"))
    return jsonify({"status": "ok"})

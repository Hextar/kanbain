from flask import current_app
from redis import Redis
from rq import Queue

from .extensions import db
from .lookups import get_project
from .planner.job import plan_project
from .serialize import utcnow

QUEUE_NAME = "kanbain"


def get_queue() -> Queue:
    return Queue(QUEUE_NAME, connection=Redis.from_url(current_app.config["REDIS_URL"]))


def enqueue_plan(project_id: str) -> None:
    if current_app.config.get("TESTING"):
        return
    try:
        get_queue().enqueue(plan_project, project_id, job_timeout=300)
    except Exception as exc:
        project = get_project(project_id)
        project.plan_status = "failed"
        project.plan_error = f"Could not enqueue planner: {exc}"
        project.updated_at = utcnow()
        db.session.commit()

from __future__ import annotations

import time

from typing import Protocol

from flask import current_app, has_app_context

from ..extensions import db
from ..lookups import UnknownEntityError, get_project
from ..models import Project
from ..serialize import utcnow
from .apply import apply_plan
from .effort import PLAN_TIMEOUT_MESSAGE
from .schema import PlannerResult
from .stub import StubPlanner


class Planner(Protocol):
    def generate(self, project: Project) -> PlannerResult: ...


def get_planner() -> Planner:
    kind = current_app.config.get("PLANNER", "openai")
    if kind == "stub":
        return StubPlanner()
    if kind == "openai":
        from .graph import LangGraphPlanner

        return LangGraphPlanner()
    raise RuntimeError(f"Unknown PLANNER '{kind}'")


def plan_project(project_id: str) -> None:
    if has_app_context():
        _run_plan(project_id)
        return
    from .. import create_app

    app = create_app()
    with app.app_context():
        _run_plan(project_id)


def _run_plan(project_id: str) -> None:
    try:
        try:
            project = get_project(project_id)
        except UnknownEntityError:
            return

        try:
            kind = current_app.config.get("PLANNER", "openai")
            print(f"planner={kind} project_id={project_id}", flush=True)
            if kind != "openai":
                delay = float(current_app.config.get("PLANNER_DELAY_SECONDS") or 0)
                if delay > 0:
                    time.sleep(delay)
            result = get_planner().generate(project)
            _log_block("composed prompt", result.prompt)
            _log_block("LLM output", result.raw)
            project = get_project(project_id)
            actions = apply_plan(project, result.plan, raw=result.raw)
            _log_block("taken actions", "\n".join(f"  {line}" for line in actions))
        except Exception as exc:
            project = get_project(project_id)
            project.plan_status = "failed"
            project.plan_error = _plan_error_message(exc)
            project.plan_phase = None
            project.updated_at = utcnow()
            db.session.commit()
    finally:
        db.session.remove()


def _plan_error_message(exc: Exception) -> str:
    name = type(exc).__name__
    if "Timeout" in name or "Recursion" in name:
        return PLAN_TIMEOUT_MESSAGE
    return str(exc)


def _log_block(label: str, body: str) -> None:
    print(f"\n===== {label} =====\n{body}\n", flush=True)

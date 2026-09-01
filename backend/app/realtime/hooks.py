from __future__ import annotations

from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from .bus import plan_payload, publish_project_event

_PLAN_ATTRS = frozenset({"plan_status", "plan_phase", "plan_error", "plan_markdown"})
_INFO_PLAN = "kanbain_rt_plan"
_INFO_BOARD = "kanbain_rt_board"


def register_session_hooks() -> None:
    if not event.contains(Session, "after_flush", _after_flush):
        event.listen(Session, "after_flush", _after_flush)
    if not event.contains(Session, "after_commit", _after_commit):
        event.listen(Session, "after_commit", _after_commit)
    if not event.contains(Session, "after_rollback", _after_rollback):
        event.listen(Session, "after_rollback", _after_rollback)


def _after_flush(session: Session, _ctx) -> None:
    from ..models import BoardColumn, Milestone, Project, Task

    plans: dict[str, dict] = session.info.setdefault(_INFO_PLAN, {})
    boards: set[str] = session.info.setdefault(_INFO_BOARD, set())
    for obj in set(session.new) | set(session.dirty) | set(session.deleted):
        if isinstance(obj, Project):
            if obj in session.deleted:
                continue
            if _plan_changed(obj):
                plans[obj.id] = plan_payload(obj)
            continue
        if isinstance(obj, (Task, BoardColumn, Milestone)):
            project_id = getattr(obj, "project_id", None)
            if project_id:
                boards.add(project_id)


def _after_commit(session: Session) -> None:
    plans = session.info.pop(_INFO_PLAN, None) or {}
    boards = session.info.pop(_INFO_BOARD, None) or set()
    for project_id, payload in plans.items():
        publish_project_event(project_id, "plan.updated", payload)
    for project_id in boards:
        publish_project_event(project_id, "board.updated")


def _after_rollback(session: Session) -> None:
    session.info.pop(_INFO_PLAN, None)
    session.info.pop(_INFO_BOARD, None)


def _plan_changed(project) -> bool:
    state = inspect(project)
    if state.pending:
        return project.plan_status in {"planning", "failed"}
    for name in _PLAN_ATTRS:
        if state.attrs[name].history.has_changes():
            return True
    return False

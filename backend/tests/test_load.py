from datetime import datetime, timezone, timedelta
from types import SimpleNamespace

from app.planner.schema import ParsedPlan, ParsedTask
from app.rag.load import evaluate_load


def test_evaluate_load_warns_when_hours_exceed_capacity():
    project = SimpleNamespace(
        deadline_kind="hard",
        deadline_at=datetime.now(timezone.utc) + timedelta(days=7),
        members=[SimpleNamespace(capacity=5)],
    )
    plan = ParsedPlan(
        title="X",
        milestones=[],
        tasks=[
            ParsedTask(title="Epic", work_kind="epic"),
            ParsedTask(title="Leaf", work_kind="task", estimate_hours=80),
        ],
    )
    warning = evaluate_load(project, plan)
    assert warning is not None
    assert "80" in warning


def test_evaluate_load_skips_ongoing():
    project = SimpleNamespace(deadline_kind="ongoing", deadline_at=None, members=[])
    plan = ParsedPlan(title="X", milestones=[], tasks=[])
    assert evaluate_load(project, plan) is None

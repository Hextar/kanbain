from pathlib import Path

import pytest

from app.planner.parse import PlanParseError, parse_plan

GOLDEN = Path(__file__).parent / "fixtures" / "plan_golden.md"


def test_parse_golden_fixture():
    plan = parse_plan(GOLDEN.read_text())
    assert plan.title == "KanbAIn"
    assert [milestone.title for milestone in plan.milestones] == ["Beta"]
    assert plan.milestones[0].due_at is not None
    assert [task.title for task in plan.tasks] == [
        "Board",
        "Persist cards",
        "Write migration",
        "Add API tests",
    ]
    assert [task.work_kind for task in plan.tasks] == ["epic", "story", "task", "task"]
    assert plan.tasks[1].parent_index == 0
    assert plan.tasks[2].parent_index == 1
    assert plan.tasks[2].estimate_tshirt == "s"
    assert plan.tasks[2].estimate_points == 1
    assert plan.tasks[2].estimate_hours == 2
    assert plan.tasks[2].depends_on == ["Persist cards"]
    assert plan.tasks[2].acceptance == [
        "Schema includes project_id",
        "Alembic revision is reversible",
    ]
    assert plan.tasks[3].assignee == "Ada"
    assert plan.tasks[3].milestone == "Beta"


def test_parse_ignores_unknown_fields():
    plan = parse_plan(
        """
# Demo

## Tasks

### Setup
- Kind: epic
- Flavor: spicy
- Priority: low
""".strip()
    )
    assert plan.tasks[0].priority == "low"
    assert plan.tasks[0].description is None


@pytest.mark.parametrize("markdown", ["", "   ", "# Only a title\n"])
def test_parse_rejects_empty_or_taskless_plans(markdown):
    with pytest.raises(PlanParseError):
        parse_plan(markdown)

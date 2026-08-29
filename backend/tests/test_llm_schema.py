import json

import pytest

from app.planner.llm_schema import plan_from_llm_json
from app.planner.parse import PlanParseError
from tests.plan_fixtures import SAMPLE_LLM_PLAN


def test_nested_llm_json_flattens_to_parsed_plan():
    plan = plan_from_llm_json(json.dumps(SAMPLE_LLM_PLAN))
    assert plan.title == "Launch site"
    assert [milestone.title for milestone in plan.milestones] == ["Launch"]
    assert plan.milestones[0].due_at is not None
    assert [task.title for task in plan.tasks] == [
        "Launch site",
        "Foundation",
        "Capture constraints",
        "Seed the backlog",
    ]
    assert [task.work_kind for task in plan.tasks] == ["epic", "story", "task", "task"]
    assert plan.tasks[1].parent_index == 0
    assert plan.tasks[2].parent_index == 1
    assert plan.tasks[3].parent_index == 1
    assert plan.tasks[2].estimate_tshirt == "s"
    assert plan.tasks[2].estimate_points == 1
    assert plan.tasks[2].estimate_hours == 2
    assert plan.tasks[2].acceptance == ["Goal, team, and deadline are reflected on cards"]
    assert plan.tasks[3].depends_on == ["Capture constraints"]
    assert plan.tasks[3].assignee == "Ada"
    assert plan.tasks[3].milestone == "Launch"


def test_plan_from_llm_json_rejects_empty_epics():
    with pytest.raises(PlanParseError, match="no tasks"):
        plan_from_llm_json(json.dumps({"title": "Empty", "milestones": [], "epics": []}))


def test_plan_from_llm_json_rejects_invalid_json():
    with pytest.raises(PlanParseError, match="invalid"):
        plan_from_llm_json("not-json")

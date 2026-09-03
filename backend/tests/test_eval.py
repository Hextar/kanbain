import json

from app.planner.eval import score_plan
from app.planner.llm_schema import build_plan_schema, plan_from_llm_json
from tests.plan_fixtures import SAMPLE_LLM_PLAN


def test_sample_plan_fails_shape_eval():
    plan = plan_from_llm_json(json.dumps(SAMPLE_LLM_PLAN))
    result = score_plan(plan, team_names=["Ada"])
    assert result["ok"] is False
    assert any("epics=" in issue for issue in result["issues"])


def test_score_plan_accepts_bounded_tree():
    epic = {
        "title": "Epic {n}",
        "description": "d",
        "priority": "high",
        "assignee": "Ada",
        "milestone": "M1",
        "estimateTshirt": "M",
        "estimatePoints": 3,
        "estimateHours": 4,
        "due": None,
        "dependsOn": [],
        "acceptance": [],
        "stories": [
            {
                "title": "Story {n}-a",
                "description": "d",
                "priority": "high",
                "assignee": "Ada",
                "milestone": "M1",
                "estimateTshirt": "S",
                "estimatePoints": 2,
                "estimateHours": 3,
                "due": None,
                "dependsOn": [],
                "acceptance": [],
                "tasks": [
                    {
                        "title": "Task {n}-a1",
                        "description": "d",
                        "priority": "high",
                        "assignee": "Ada",
                        "milestone": "M1",
                        "estimateTshirt": "S",
                        "estimatePoints": 1,
                        "estimateHours": 2,
                        "due": None,
                        "dependsOn": [],
                        "acceptance": ["Done"],
                    },
                    {
                        "title": "Task {n}-a2",
                        "description": "d",
                        "priority": "medium",
                        "assignee": "Ada",
                        "milestone": "M1",
                        "estimateTshirt": "S",
                        "estimatePoints": 1,
                        "estimateHours": 2,
                        "due": None,
                        "dependsOn": [f"Task {{n}}-a1"],
                        "acceptance": ["Also done"],
                    },
                ],
            },
            {
                "title": "Story {n}-b",
                "description": "d",
                "priority": "medium",
                "assignee": "Ada",
                "milestone": "M1",
                "estimateTshirt": "S",
                "estimatePoints": 2,
                "estimateHours": 3,
                "due": None,
                "dependsOn": [],
                "acceptance": [],
                "tasks": [
                    {
                        "title": "Task {n}-b1",
                        "description": "d",
                        "priority": "medium",
                        "assignee": "Ada",
                        "milestone": "M1",
                        "estimateTshirt": "S",
                        "estimatePoints": 1,
                        "estimateHours": 1,
                        "due": None,
                        "dependsOn": [],
                        "acceptance": ["Ok"],
                    },
                    {
                        "title": "Task {n}-b2",
                        "description": "d",
                        "priority": "low",
                        "assignee": None,
                        "milestone": "M1",
                        "estimateTshirt": "S",
                        "estimatePoints": 1,
                        "estimateHours": 1,
                        "due": None,
                        "dependsOn": [],
                        "acceptance": ["Ok"],
                    },
                ],
            },
        ],
    }
    payload = {
        "title": "Healthy",
        "milestones": [
            {"title": "M1", "due": "2026-12-01"},
            {"title": "M2", "due": None},
        ],
        "epics": [
            json.loads(json.dumps(epic).replace("{n}", "1")),
            json.loads(json.dumps(epic).replace("{n}", "2")),
        ],
    }
    plan = plan_from_llm_json(json.dumps(payload))
    result = score_plan(plan, team_names=["Ada"])
    assert result["issues"] == []
    assert result["ok"] is True


def test_plan_schema_uses_team_enum():
    schema = build_plan_schema(["Ada"])
    assignee = schema["properties"]["epics"]["items"]["properties"]["assignee"]
    assert "Ada" in assignee["anyOf"][0]["enum"]
    empty = build_plan_schema([])
    assert empty["properties"]["epics"]["items"]["properties"]["assignee"] == {"type": "null"}

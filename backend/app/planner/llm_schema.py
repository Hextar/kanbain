from __future__ import annotations

import json
import re
from typing import Any

from ..serialize import parse_datetime
from .parse import PlanParseError
from .schema import ParsedMilestone, ParsedPlan, ParsedTask

TSHIRTS = {"xs", "s", "m", "l", "xl"}
PRIORITIES = {"low", "medium", "high"}

_NULLABLE_STRING = {"anyOf": [{"type": "string"}, {"type": "null"}]}
_NULLABLE_INT = {"anyOf": [{"type": "integer"}, {"type": "null"}]}
_NULLABLE_NUMBER = {"anyOf": [{"type": "number"}, {"type": "null"}]}
_PRIORITY = {"type": "string", "enum": ["low", "medium", "high"]}
_TSHIRT = {
    "anyOf": [
        {"type": "string", "enum": ["XS", "S", "M", "L", "XL"]},
        {"type": "null"},
    ]
}

_ITEM_FIELDS = {
    "title": {"type": "string"},
    "description": _NULLABLE_STRING,
    "priority": _PRIORITY,
    "assignee": _NULLABLE_STRING,
    "milestone": _NULLABLE_STRING,
    "estimateTshirt": _TSHIRT,
    "estimatePoints": _NULLABLE_INT,
    "estimateHours": _NULLABLE_NUMBER,
    "due": _NULLABLE_STRING,
    "dependsOn": {"type": "array", "items": {"type": "string"}},
    "acceptance": {"type": "array", "items": {"type": "string"}},
}

_TASK_REQUIRED = list(_ITEM_FIELDS)
_STORY_REQUIRED = [*_TASK_REQUIRED, "tasks"]
_EPIC_REQUIRED = [*_TASK_REQUIRED, "stories"]

PLAN_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "milestones", "epics"],
    "properties": {
        "title": {"type": "string"},
        "milestones": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["title", "due"],
                "properties": {
                    "title": {"type": "string"},
                    "due": _NULLABLE_STRING,
                },
            },
        },
        "epics": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": _EPIC_REQUIRED,
                "properties": {
                    **_ITEM_FIELDS,
                    "stories": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": _STORY_REQUIRED,
                            "properties": {
                                **_ITEM_FIELDS,
                                "tasks": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": _TASK_REQUIRED,
                                        "properties": _ITEM_FIELDS,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
}

OPENAI_RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "kanban_plan",
        "strict": True,
        "schema": PLAN_JSON_SCHEMA,
    },
}


def plan_from_llm_json(raw: str) -> ParsedPlan:
    data = _parse_json_object(raw)
    milestones = [
        ParsedMilestone(title=_require_title(item, "milestone"), due_at=_parse_due(item.get("due")))
        for item in _as_list(data.get("milestones"))
    ]
    tasks: list[ParsedTask] = []
    for epic in _as_list(data.get("epics")):
        epic_index = len(tasks)
        tasks.append(_item_to_task(epic, "epic", None))
        for story in _as_list(epic.get("stories")):
            story_index = len(tasks)
            tasks.append(_item_to_task(story, "story", epic_index))
            for task in _as_list(story.get("tasks")):
                tasks.append(_item_to_task(task, "task", story_index))
    if not tasks:
        raise PlanParseError("plan has no tasks")
    title = data.get("title")
    return ParsedPlan(
        title=title.strip() if isinstance(title, str) and title.strip() else None,
        milestones=milestones,
        tasks=tasks,
    )


def _parse_json_object(raw: str) -> dict[str, Any]:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise PlanParseError("plan JSON is invalid") from exc
    if not isinstance(data, dict):
        raise PlanParseError("plan JSON must be an object")
    return data


def _item_to_task(item: object, work_kind: str, parent_index: int | None) -> ParsedTask:
    if not isinstance(item, dict):
        raise PlanParseError(f"{work_kind} must be an object")
    tshirt = item.get("estimateTshirt") or item.get("estimate_tshirt")
    points = item.get("estimatePoints") if "estimatePoints" in item else item.get("estimate_points")
    hours = item.get("estimateHours") if "estimateHours" in item else item.get("estimate_hours")
    priority = item.get("priority")
    return ParsedTask(
        title=_require_title(item, work_kind),
        work_kind=work_kind,
        parent_index=parent_index,
        description=_optional_text(item.get("description")),
        estimate_tshirt=_tshirt(tshirt),
        estimate_points=_optional_int(points),
        estimate_hours=_optional_float(hours),
        priority=priority.strip().lower() if isinstance(priority, str) and priority.strip().lower() in PRIORITIES else None,
        assignee=_optional_text(item.get("assignee")),
        due_at=_parse_due(item.get("due")),
        milestone=_optional_text(item.get("milestone")),
        depends_on=_string_list(item.get("dependsOn") or item.get("depends_on")),
        acceptance=_string_list(item.get("acceptance")),
    )


def _require_title(item: dict[str, Any], kind: str) -> str:
    title = item.get("title")
    if not isinstance(title, str) or not title.strip():
        raise PlanParseError(f"{kind} title is required")
    return title.strip()


def _optional_text(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    return stripped or None


def _optional_int(value: object) -> int | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return None


def _optional_float(value: object) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _tshirt(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    lowered = value.strip().lower()
    return lowered if lowered in TSHIRTS else None


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def _as_list(value: object) -> list[Any]:
    if not isinstance(value, list):
        return []
    return value


def _parse_due(value: object):
    if not isinstance(value, str) or not value.strip():
        return None
    text = value.strip()
    try:
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
            return parse_datetime(f"{text}T00:00:00Z")
        return parse_datetime(text)
    except ValueError:
        return None

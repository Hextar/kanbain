from __future__ import annotations

import re

from ..serialize import parse_datetime
from .schema import ParsedMilestone, ParsedPlan, ParsedTask

HEADING_RE = re.compile(r"^(#{1,5})\s+(.+?)\s*$")
FIELD_RE = re.compile(r"^-\s*([^:]+):\s*(.*)$")
MILESTONE_RE = re.compile(r"^-\s*(.+?)\s*\|\s*(\S+)\s*$")
NESTED_ITEM_RE = re.compile(r"^\s+-\s+(.+)$")
HOURS_RE = re.compile(r"^(\d+(?:\.\d+)?)\s*h?$", re.IGNORECASE)
TSHIRTS = {"xs", "s", "m", "l", "xl"}
WORK_KINDS = {"epic", "story", "task"}
PRIORITIES = {"low", "medium", "high"}
KIND_BY_LEVEL = {3: "epic", 4: "story", 5: "task"}


class PlanParseError(ValueError):
    pass


def parse_plan(markdown: str) -> ParsedPlan:
    if not isinstance(markdown, str) or not markdown.strip():
        raise PlanParseError("plan markdown is empty")

    lines = markdown.replace("\r\n", "\n").split("\n")
    title: str | None = None
    section: str | None = None
    milestones: list[ParsedMilestone] = []
    tasks: list[ParsedTask] = []
    current_task: ParsedTask | None = None
    collecting_acceptance = False
    epic_index: int | None = None
    story_index: int | None = None

    for raw in lines:
        heading = HEADING_RE.match(raw)
        if heading:
            collecting_acceptance = False
            level = len(heading.group(1))
            text = heading.group(2).strip()
            if level == 1:
                title = text
                section = None
                current_task = None
                continue
            if level == 2:
                key = text.lower()
                if key.startswith("milestone"):
                    section = "milestones"
                elif key.startswith("task"):
                    section = "tasks"
                else:
                    section = None
                current_task = None
                continue
            if section == "tasks" and level in KIND_BY_LEVEL:
                parent_index = None
                if level == 4:
                    parent_index = epic_index
                    story_index = None
                elif level == 5:
                    parent_index = story_index if story_index is not None else epic_index
                task = ParsedTask(title=text, work_kind=KIND_BY_LEVEL[level], parent_index=parent_index)
                tasks.append(task)
                current_task = task
                index = len(tasks) - 1
                if level == 3:
                    epic_index = index
                    story_index = None
                elif level == 4:
                    story_index = index
                continue
            current_task = None
            continue

        if section == "milestones":
            milestone = MILESTONE_RE.match(raw)
            if milestone:
                milestones.append(
                    ParsedMilestone(
                        title=milestone.group(1).strip(),
                        due_at=_parse_date(milestone.group(2).strip()),
                    )
                )
            continue

        if section != "tasks" or current_task is None:
            continue

        nested = NESTED_ITEM_RE.match(raw)
        if collecting_acceptance and nested:
            current_task.acceptance.append(nested.group(1).strip())
            continue

        field = FIELD_RE.match(raw)
        if not field:
            collecting_acceptance = False
            continue

        key = field.group(1).strip().lower()
        value = field.group(2).strip()
        collecting_acceptance = key.startswith("acceptance")
        if collecting_acceptance:
            if value:
                current_task.acceptance.append(value)
            continue
        _apply_field(current_task, key, value)

    if not tasks:
        raise PlanParseError("plan markdown has no tasks")
    return ParsedPlan(title=title, milestones=milestones, tasks=tasks)


def _apply_field(task: ParsedTask, key: str, value: str) -> None:
    if not value:
        return
    if key == "kind":
        kind = value.strip().lower()
        if kind in WORK_KINDS:
            task.work_kind = kind
        return
    if key == "description":
        task.description = value
        return
    if key == "estimate":
        _apply_estimate(task, value)
        return
    if key == "priority":
        priority = value.strip().lower()
        if priority in PRIORITIES:
            task.priority = priority
        return
    if key == "assignee":
        task.assignee = value
        return
    if key == "due":
        task.due_at = _parse_date(value)
        return
    if key == "milestone":
        task.milestone = value
        return
    if key == "depends":
        task.depends_on = [part.strip() for part in value.split(",") if part.strip()]


def _apply_estimate(task: ParsedTask, value: str) -> None:
    parts = [part.strip() for part in value.split("|") if part.strip()]
    for part in parts:
        lowered = part.lower()
        if lowered in TSHIRTS:
            task.estimate_tshirt = lowered
            continue
        if part.isdigit():
            task.estimate_points = int(part)
            continue
        hours = HOURS_RE.match(part)
        if hours:
            task.estimate_hours = float(hours.group(1))


def _parse_date(value: str):
    try:
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return parse_datetime(f"{value}T00:00:00Z")
        return parse_datetime(value)
    except ValueError:
        return None

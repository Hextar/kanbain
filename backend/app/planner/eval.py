from __future__ import annotations

from collections import defaultdict

from .llm_schema import (
    EPIC_MAX,
    EPIC_MIN,
    LEAF_MAX,
    LEAF_MIN,
    MILESTONE_MAX,
    MILESTONE_MIN,
    STORY_MAX,
    STORY_MIN,
)
from .schema import ParsedPlan, ParsedTask


def score_plan(plan: ParsedPlan, *, team_names: list[str] | None = None) -> dict[str, object]:
    issues: list[str] = []
    team = {_norm(name) for name in team_names or [] if name.strip()}
    titles = [_norm(task.title) for task in plan.tasks]
    title_set = set(titles)

    milestone_count = len(plan.milestones)
    if not (MILESTONE_MIN <= milestone_count <= MILESTONE_MAX):
        issues.append(f"milestones={milestone_count} not in {MILESTONE_MIN}-{MILESTONE_MAX}")

    epics = [task for task in plan.tasks if task.work_kind == "epic"]
    if not (EPIC_MIN <= len(epics) <= EPIC_MAX):
        issues.append(f"epics={len(epics)} not in {EPIC_MIN}-{EPIC_MAX}")

    stories_by_epic: dict[int, list[ParsedTask]] = defaultdict(list)
    leaves_by_story: dict[int, list[ParsedTask]] = defaultdict(list)
    for index, task in enumerate(plan.tasks):
        if task.work_kind == "story" and task.parent_index is not None:
            stories_by_epic[task.parent_index].append(task)
        if task.work_kind == "task" and task.parent_index is not None:
            leaves_by_story[task.parent_index].append(task)

    for epic_index, stories in stories_by_epic.items():
        if not (STORY_MIN <= len(stories) <= STORY_MAX):
            issues.append(
                f"epic={plan.tasks[epic_index].title!r} stories={len(stories)} "
                f"not in {STORY_MIN}-{STORY_MAX}"
            )
    for story_index, leaves in leaves_by_story.items():
        if not (LEAF_MIN <= len(leaves) <= LEAF_MAX):
            issues.append(
                f"story={plan.tasks[story_index].title!r} tasks={len(leaves)} "
                f"not in {LEAF_MIN}-{LEAF_MAX}"
            )

    milestone_titles = {_norm(item.title) for item in plan.milestones}
    for task in plan.tasks:
        if task.work_kind == "task":
            if not task.acceptance:
                issues.append(f"leaf={task.title!r} missing acceptance")
            if not task.estimate_tshirt and task.estimate_points is None and task.estimate_hours is None:
                issues.append(f"leaf={task.title!r} missing estimate")
        if plan.milestones and not task.milestone:
            issues.append(f"card={task.title!r} missing milestone")
        elif task.milestone and _norm(task.milestone) not in milestone_titles:
            issues.append(f"card={task.title!r} unknown milestone={task.milestone!r}")
        if task.assignee:
            if not team:
                issues.append(f"card={task.title!r} assignee={task.assignee!r} with empty team")
            elif _norm(task.assignee) not in team:
                issues.append(f"card={task.title!r} assignee={task.assignee!r} not on team")
        for dep in task.depends_on:
            if _norm(dep) not in title_set:
                issues.append(f"card={task.title!r} dependsOn={dep!r} does not resolve")

    return {"ok": not issues, "issues": issues}


def _norm(value: str | None) -> str:
    return (value or "").strip().lower()

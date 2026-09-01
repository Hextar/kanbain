from __future__ import annotations

import json

from ..models import Project
from ..serialize import dump_datetime, dump_number

SYSTEM_PROMPT = """\
You are an expert project manager. You turn project constraints into a kanban-ready \
breakdown of epics, stories, and tasks.

Always answer with JSON that matches the provided schema. No markdown, no commentary, \
no extra keys.

Rules:
- Produce 2–4 milestones that cover the deadline. Every epic, story, and leaf \
task must set milestone to one of those titles. Never leave milestone null when \
milestones exist. A story and its leaf tasks share a milestone unless there is \
a clear reason to split.
- Produce 2–4 epics. Each epic has 2–4 stories. Each story has 2–5 leaf tasks.
- Nest stories under epics and tasks under stories.
- Assign work only to people named on the team. If the team is empty, set assignee to null.
- Put estimates on every story and leaf task (t-shirt, points, and hours when you can).
- Write acceptance criteria on every leaf task.
- Dependencies may only reference titles that exist in this plan.
- Honor the deadline kind and date, methodology (kanban vs scrum), quality bar, and risk tolerance.
- Prefer fewer, load-bearing cards over a huge backlog. MVP quality bars stay lean; \
production-grade plans include hardening, tests, and rollout.
"""


def compose_messages(
    project: Project,
    *,
    research: str = "",
    outline: str = "",
    draft: str = "",
    issues: list[str] | None = None,
) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": compose_user_prompt(
                project,
                research=research,
                outline=outline,
                draft=draft,
                issues=issues,
            ),
        },
    ]


def compose_user_prompt(
    project: Project,
    *,
    research: str = "",
    outline: str = "",
    draft: str = "",
    issues: list[str] | None = None,
) -> str:
    payload = {
        "name": project.name,
        "goal": project.goal,
        "description": project.description,
        "prdUrl": project.prd_url,
        "designUrls": project.design_urls or [],
        "repoUrl": project.repo_url,
        "deadlineKind": project.deadline_kind,
        "deadlineAt": dump_datetime(project.deadline_at),
        "methodology": project.methodology,
        "qualityBar": project.quality_bar,
        "riskTolerance": project.risk_tolerance,
        "team": [
            {
                "name": member.name,
                "role": member.role,
                "seniority": member.seniority,
                "capacity": dump_number(member.capacity),
            }
            for member in project.members
        ],
    }
    parts = [
        "Create a kanban plan for this project. Use the team as the only assignees.",
        json.dumps(payload, indent=2),
    ]
    if research.strip():
        parts.append(f"Research notes:\n{research.strip()}")
    if outline.strip():
        parts.append(f"Work breakdown outline:\n{outline.strip()}")
    if draft.strip():
        parts.append(f"Current draft plan JSON:\n{draft.strip()}")
    if issues:
        bullets = "\n".join(f"- {item}" for item in issues if item.strip())
        if bullets:
            parts.append(f"Fix these critique issues:\n{bullets}")
    return "\n\n".join(parts)


def format_prompt_for_log(messages: list[dict[str, str]]) -> str:
    return "\n\n".join(
        f"{message['role'].upper()}:\n{message['content']}" for message in messages
    )

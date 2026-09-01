from __future__ import annotations

import json
from contextvars import ContextVar
from typing import Any

from openai import OpenAI

from ..extensions import db
from ..lookups import get_project
from ..serialize import utcnow
from .llm import complete_json
from .openai_planner import OpenAIPlanner
from .prompt import compose_user_prompt

_generate_client: ContextVar[OpenAI | None] = ContextVar("generate_client", default=None)

EXPLORE_SYSTEM = """\
You are a staff engineer and product lead. Study the project brief deeply.
Do not fetch URLs; treat attached URL strings as labels only.
Return JSON: {"research": "markdown notes covering domain, risks, missing \
info, and a suggested approach"}."""

DECOMPOSE_SYSTEM = """\
You are a project manager. Turn the brief and research into a lean work \
breakdown. Return JSON:
{"milestones": [{"title": "string", "due": "string or null"}], \
"epics": [{"title": "string", "description": "string", \
"stories": [{"title": "string"}]}]}
Honor 2-4 milestones, 2-4 epics, 2-4 stories per epic."""

CRITIQUE_SYSTEM = """\
You are a demanding tech lead reviewing a kanban plan JSON against the brief.
Return JSON: {"complete": true or false, "issues": ["string"], \
"next": "revise" or "explore"}
Set complete true only if coverage, estimates, assignees, milestones, and \
acceptance criteria are load-bearing and consistent.
Use next=explore when the brief itself needs more analysis; otherwise revise."""


def set_generate_client(client: OpenAI | None):
    return _generate_client.set(client)


def reset_generate_client(token) -> None:
    _generate_client.reset(token)


def set_plan_phase(project_id: str, phase: str | None) -> None:
    project = get_project(project_id)
    project.plan_phase = phase
    project.updated_at = utcnow()
    db.session.commit()


def explore(state: dict[str, Any]) -> dict[str, Any]:
    set_plan_phase(state["project_id"], "exploring")
    project = get_project(state["project_id"])
    user = compose_user_prompt(project)
    data = complete_json(EXPLORE_SYSTEM, user)
    research = _text(data.get("research")) or json.dumps(data)
    return {
        "research": research,
        "prompt_log": _append(state, "explore", f"{EXPLORE_SYSTEM}\n\n{user}\n\n{research}"),
    }


def decompose(state: dict[str, Any]) -> dict[str, Any]:
    set_plan_phase(state["project_id"], "decomposing")
    project = get_project(state["project_id"])
    user = compose_user_prompt(project, research=state.get("research") or "")
    data = complete_json(DECOMPOSE_SYSTEM, user)
    outline = json.dumps(data, indent=2)
    return {
        "outline": outline,
        "prompt_log": _append(state, "decompose", f"{DECOMPOSE_SYSTEM}\n\n{user}\n\n{outline}"),
    }


def generate(state: dict[str, Any]) -> dict[str, Any]:
    set_plan_phase(state["project_id"], "generating")
    project = get_project(state["project_id"])
    result = OpenAIPlanner(client=_generate_client.get()).generate(
        project,
        research=state.get("research") or "",
        outline=state.get("outline") or "",
    )
    return {
        "draft": result.raw,
        "prompt_log": _append(state, "generate", result.prompt),
    }


def critique(state: dict[str, Any]) -> dict[str, Any]:
    set_plan_phase(state["project_id"], "reviewing")
    project = get_project(state["project_id"])
    user = compose_user_prompt(
        project,
        research=state.get("research") or "",
        outline=state.get("outline") or "",
        draft=state.get("draft") or "",
    )
    data = complete_json(CRITIQUE_SYSTEM, user)
    issues = data.get("issues")
    nxt = data.get("next")
    critique_payload = {
        "complete": data.get("complete") is True,
        "issues": [item.strip() for item in issues if isinstance(item, str) and item.strip()]
        if isinstance(issues, list)
        else [],
        "next": nxt if nxt in {"revise", "explore"} else "revise",
    }
    return {
        "critique": critique_payload,
        "prompt_log": _append(state, "critique", f"{CRITIQUE_SYSTEM}\n\n{user}\n\n{json.dumps(critique_payload)}"),
    }


def revise(state: dict[str, Any]) -> dict[str, Any]:
    set_plan_phase(state["project_id"], "revising")
    project = get_project(state["project_id"])
    issues = (state.get("critique") or {}).get("issues") or []
    result = OpenAIPlanner(client=_generate_client.get()).generate(
        project,
        research=state.get("research") or "",
        outline=state.get("outline") or "",
        draft=state.get("draft") or "",
        issues=issues,
    )
    return {
        "draft": result.raw,
        "iteration": int(state.get("iteration") or 0) + 1,
        "prompt_log": _append(state, "revise", result.prompt),
    }


def _append(state: dict[str, Any], label: str, body: str) -> str:
    previous = state.get("prompt_log") or ""
    block = f"===== {label} =====\n{body}"
    return f"{previous}\n\n{block}" if previous else block


def _text(value: object) -> str:
    return value.strip() if isinstance(value, str) else ""

from __future__ import annotations

import json
import time
from contextvars import ContextVar
from typing import Any

from flask import current_app
from openai import OpenAI

from ..extensions import db
from ..lookups import get_project
from ..rag.classify import classify_brief, propose_source_urls
from ..rag.ingest import ingest_project_urls
from ..rag.retrieve import retrieve
from ..rag.scrape import scrape_urls
from ..serialize import utcnow
from .effort import scrape_on_miss
from .llm import complete_json
from .openai_planner import OpenAIPlanner
from .prompt import compose_user_prompt

_generate_client: ContextVar[OpenAI | None] = ContextVar("generate_client", default=None)

DECOMPOSE_SYSTEM = """\
You are a project manager. Turn the brief and research into a lean work \
breakdown. Honor 2-4 milestones, 2-4 epics, 2-4 stories per epic."""

DECOMPOSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["milestones", "epics"],
    "properties": {
        "milestones": {
            "type": "array",
            "minItems": 2,
            "maxItems": 4,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["title", "due"],
                "properties": {
                    "title": {"type": "string"},
                    "due": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                },
            },
        },
        "epics": {
            "type": "array",
            "minItems": 2,
            "maxItems": 4,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["title", "description", "stories"],
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "stories": {
                        "type": "array",
                        "minItems": 2,
                        "maxItems": 4,
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["title"],
                            "properties": {"title": {"type": "string"}},
                        },
                    },
                },
            },
        },
    },
}

CRITIQUE_SYSTEM = """\
You are a demanding tech lead reviewing a kanban plan JSON against the brief \
and cited research. Flag cards that ignore or contradict citations.
Set complete true only if coverage, estimates, assignees, milestones, and \
acceptance criteria are load-bearing and consistent.
Use next=ground when retrieval must widen; otherwise revise."""

CRITIQUE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["complete", "issues", "next"],
    "properties": {
        "complete": {"type": "boolean"},
        "issues": {"type": "array", "items": {"type": "string"}},
        "next": {"type": "string", "enum": ["revise", "ground"]},
    },
}


def set_generate_client(client: OpenAI | None):
    return _generate_client.set(client)


def reset_generate_client(token) -> None:
    _generate_client.reset(token)


def set_plan_phase(project_id: str, phase: str | None) -> None:
    project = get_project(project_id)
    project.plan_phase = phase
    project.updated_at = utcnow()
    db.session.commit()


def ground(state: dict[str, Any]) -> dict[str, Any]:
    set_plan_phase(state["project_id"], "classifying")
    project = get_project(state["project_id"])
    extra = [item.strip() for item in state.get("extra_queries") or [] if isinstance(item, str)]
    classified = classify_brief(_brief(project))
    queries = list(classified["queries"])
    queries.extend(extra)
    set_plan_phase(state["project_id"], "retrieving")
    result = retrieve(domain_slug=str(classified["domain_slug"]), queries=queries)
    set_plan_phase(state["project_id"], "ingesting")
    user_chunks = ingest_project_urls(project)
    if user_chunks:
        result = retrieve(
            domain_slug=str(classified["domain_slug"]),
            queries=queries,
            extra_chunks=user_chunks,
        )
    pending_urls: list[str] = []
    if (
        not result.coverage_ok
        and scrape_on_miss(state.get("effort") or "medium")
        and not current_app.config.get("TESTING")
    ):
        set_plan_phase(state["project_id"], "exploring")
        pending_urls = propose_source_urls(_brief(project), str(classified["domain_slug"]))
        deadline = time.monotonic() + float(
            current_app.config.get("RAG_SCRAPE_SECONDS") or 10
        )
        scrape_urls(pending_urls, domain_slug=str(classified["domain_slug"]), deadline=deadline)
        result = retrieve(
            domain_slug=str(classified["domain_slug"]),
            queries=queries,
            extra_chunks=user_chunks,
        )
    research = result.notes
    return {
        "research": research,
        "domain_slug": classified["domain_slug"],
        "queries": queries,
        "chunk_ids": [item.chunk_id for item in result.chunks],
        "pending_urls": pending_urls,
        "coverage_ok": result.coverage_ok,
        "prompt_log": _append(state, "ground", research or "(no wiki hits)"),
    }


def decompose(state: dict[str, Any]) -> dict[str, Any]:
    set_plan_phase(state["project_id"], "decomposing")
    project = get_project(state["project_id"])
    user = compose_user_prompt(project, research=state.get("research") or "")
    data = complete_json(DECOMPOSE_SYSTEM, user, schema=DECOMPOSE_SCHEMA, schema_name="decompose")
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
    data = complete_json(CRITIQUE_SYSTEM, user, schema=CRITIQUE_SCHEMA, schema_name="critique")
    issues = data.get("issues")
    nxt = data.get("next")
    critique_payload = {
        "complete": data.get("complete") is True,
        "issues": [item.strip() for item in issues if isinstance(item, str) and item.strip()]
        if isinstance(issues, list)
        else [],
        "next": nxt if nxt in {"revise", "ground"} else "revise",
    }
    extra_queries = list(critique_payload["issues"][:3]) if critique_payload["next"] == "ground" else []
    return {
        "critique": critique_payload,
        "extra_queries": extra_queries,
        "prompt_log": _append(
            state, "critique", f"{CRITIQUE_SYSTEM}\n\n{user}\n\n{json.dumps(critique_payload)}"
        ),
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


def _brief(project) -> str:
    return compose_user_prompt(project)


def _append(state: dict[str, Any], label: str, body: str) -> str:
    previous = state.get("prompt_log") or ""
    block = f"===== {label} =====\n{body}"
    return f"{previous}\n\n{block}" if previous else block

from __future__ import annotations

from typing import Any, Literal, TypedDict

from langgraph.errors import GraphRecursionError
from langgraph.graph import END, START, StateGraph

from ..models import Project
from . import nodes
from .effort import (
    PLAN_TIMEOUT_MESSAGE,
    after_critique,
    after_generate,
    entry_node,
    recursion_limit_for,
)
from .keys import get_openai_api_key
from .llm_schema import plan_from_llm_json
from .openai_planner import MISSING_KEY_MESSAGE
from .schema import PlannerResult


class PlanState(TypedDict, total=False):
    project_id: str
    effort: str
    research: str
    outline: str
    draft: str
    critique: dict[str, Any]
    iteration: int
    prompt_log: str


class LangGraphPlanner:
    def __init__(self, client=None) -> None:
        self._client = client
        self._graph = build_planner_graph()

    def generate(self, project: Project) -> PlannerResult:
        if not get_openai_api_key():
            raise RuntimeError(MISSING_KEY_MESSAGE)
        effort = project.thought_effort or "medium"
        token = nodes.set_generate_client(self._client)
        try:
            final = self._graph.invoke(
                {
                    "project_id": project.id,
                    "effort": effort,
                    "research": "",
                    "outline": "",
                    "draft": "",
                    "critique": {"complete": True, "issues": [], "next": "revise"},
                    "iteration": 0,
                    "prompt_log": "",
                },
                {"recursion_limit": recursion_limit_for(effort)},
            )
        except GraphRecursionError as exc:
            raise RuntimeError(PLAN_TIMEOUT_MESSAGE) from exc
        finally:
            nodes.reset_generate_client(token)

        raw = (final.get("draft") or "").strip()
        if not raw:
            raise RuntimeError("Planner returned an empty plan")
        return PlannerResult(
            prompt=final.get("prompt_log") or "",
            raw=raw,
            plan=plan_from_llm_json(raw),
        )


def build_planner_graph():
    graph = StateGraph(PlanState)
    graph.add_node("explore", nodes.explore)
    graph.add_node("decompose", nodes.decompose)
    graph.add_node("generate", nodes.generate)
    graph.add_node("critique", nodes.critique)
    graph.add_node("revise", nodes.revise)
    graph.add_conditional_edges(
        START,
        route_entry,
        {"explore": "explore", "decompose": "decompose", "generate": "generate"},
    )
    graph.add_edge("explore", "decompose")
    graph.add_edge("decompose", "generate")
    graph.add_conditional_edges(
        "generate",
        route_after_generate,
        {"critique": "critique", "end": END},
    )
    graph.add_conditional_edges(
        "critique",
        route_after_critique,
        {"revise": "revise", "explore": "explore", "end": END},
    )
    graph.add_edge("revise", "critique")
    return graph.compile()


def route_entry(state: PlanState) -> Literal["explore", "decompose", "generate"]:
    return entry_node(state.get("effort") or "medium")


def route_after_generate(state: PlanState) -> Literal["critique", "end"]:
    return after_generate(state.get("effort") or "medium")


def route_after_critique(state: PlanState) -> Literal["revise", "explore", "end"]:
    critique = state.get("critique") or {}
    return after_critique(
        state.get("effort") or "medium",
        complete=bool(critique.get("complete")),
        iteration=int(state.get("iteration") or 0),
        nxt=str(critique.get("next") or "revise"),
    )

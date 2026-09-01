from __future__ import annotations

from typing import Literal

ThoughtEffort = Literal["low", "medium", "high", "max"]
PlanPhase = Literal["exploring", "decomposing", "generating", "reviewing", "revising"]
EntryNode = Literal["explore", "decompose", "generate"]
AfterGenerate = Literal["critique", "end"]
AfterCritique = Literal["revise", "explore", "end"]

THOUGHT_EFFORTS = frozenset({"low", "medium", "high", "max"})
DEFAULT_THOUGHT_EFFORT: ThoughtEffort = "medium"

HIGH_MAX_REVISE_LOOPS = 2
MAX_RECURSION_LIMIT = 1000
DEFAULT_RECURSION_LIMIT = 25

JOB_TIMEOUT_SECONDS = {
    "low": 180,
    "medium": 300,
    "high": 600,
    "max": 1800,
}

PLAN_TIMEOUT_MESSAGE = "Planning timed out. Retry, or pick a lower thought effort."


def job_timeout_seconds(effort: str) -> int:
    return JOB_TIMEOUT_SECONDS.get(effort, JOB_TIMEOUT_SECONDS[DEFAULT_THOUGHT_EFFORT])


def recursion_limit_for(effort: str) -> int:
    if effort == "max":
        return MAX_RECURSION_LIMIT
    return DEFAULT_RECURSION_LIMIT


def entry_node(effort: str) -> EntryNode:
    if effort == "low":
        return "generate"
    if effort == "medium":
        return "decompose"
    return "explore"


def after_generate(effort: str) -> AfterGenerate:
    if effort in {"high", "max"}:
        return "critique"
    return "end"


def after_critique(effort: str, *, complete: bool, iteration: int, nxt: str) -> AfterCritique:
    if complete:
        return "end"
    if effort == "high":
        if iteration >= HIGH_MAX_REVISE_LOOPS:
            return "end"
        return "revise"
    if nxt == "explore":
        return "explore"
    return "revise"

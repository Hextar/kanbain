import json

from app.lookups import get_project
from app.planner.effort import after_critique, after_generate, entry_node
from app.planner.graph import LangGraphPlanner
from app.planner.job import plan_project
from app.planner.keys import set_openai_api_key
from tests.plan_fixtures import SAMPLE_LLM_PLAN


def test_entry_node_matches_effort():
    assert entry_node("low") == "generate"
    assert entry_node("medium") == "decompose"
    assert entry_node("high") == "explore"
    assert entry_node("max") == "explore"


def test_after_generate_skips_critique_for_low_and_medium():
    assert after_generate("low") == "end"
    assert after_generate("medium") == "end"
    assert after_generate("high") == "critique"
    assert after_generate("max") == "critique"


def test_high_critique_stops_after_two_revise_loops():
    assert after_critique("high", complete=False, iteration=0, nxt="revise") == "revise"
    assert after_critique("high", complete=False, iteration=1, nxt="revise") == "revise"
    assert after_critique("high", complete=False, iteration=2, nxt="revise") == "end"
    assert after_critique("high", complete=True, iteration=0, nxt="revise") == "end"


def test_max_critique_follows_next_until_complete():
    assert after_critique("max", complete=False, iteration=9, nxt="explore") == "explore"
    assert after_critique("max", complete=False, iteration=9, nxt="revise") == "revise"
    assert after_critique("max", complete=True, iteration=9, nxt="explore") == "end"


def _patch_nodes(monkeypatch, *, explore=None, decompose=None, generate=None, critique=None, revise=None):
    if explore is not None:
        monkeypatch.setattr("app.planner.nodes.explore", explore)
    if decompose is not None:
        monkeypatch.setattr("app.planner.nodes.decompose", decompose)
    if generate is not None:
        monkeypatch.setattr("app.planner.nodes.generate", generate)
    if critique is not None:
        monkeypatch.setattr("app.planner.nodes.critique", critique)
    if revise is not None:
        monkeypatch.setattr("app.planner.nodes.revise", revise)


def _draft_generate(calls):
    def generate(state):
        calls.append("generate")
        return {"draft": json.dumps(SAMPLE_LLM_PLAN)}

    return generate


def test_low_effort_never_invokes_explore_or_critique(client, app, monkeypatch):
    app.config["PLANNER"] = "openai"
    calls: list[str] = []

    def explore(_state):
        calls.append("explore")
        return {"research": "should not run"}

    def critique(_state):
        calls.append("critique")
        return {"critique": {"complete": False, "issues": ["x"], "next": "revise"}}

    _patch_nodes(
        monkeypatch,
        explore=explore,
        generate=_draft_generate(calls),
        critique=critique,
    )
    created = client.post(
        "/api/projects",
        json={"name": "Low", "thoughtEffort": "low"},
    ).get_json()

    with app.app_context():
        set_openai_api_key("sk-test")
        monkeypatch.setattr(
            "app.planner.job.get_planner",
            lambda: LangGraphPlanner(),
        )
        plan_project(created["id"])

    ready = client.get(f"/api/projects/{created['id']}").get_json()
    assert ready["planStatus"] == "ready"
    assert "planPhase" not in ready
    assert calls == ["generate"]


def test_high_effort_stops_after_two_revise_loops(client, app, monkeypatch):
    app.config["PLANNER"] = "openai"
    calls: list[str] = []

    def explore(_state):
        calls.append("explore")
        return {"research": "notes"}

    def decompose(_state):
        calls.append("decompose")
        return {"outline": "{}"}

    def critique(state):
        calls.append("critique")
        return {
            "critique": {"complete": False, "issues": ["thin"], "next": "revise"},
            "iteration": state.get("iteration") or 0,
        }

    def revise(state):
        calls.append("revise")
        return {
            "draft": json.dumps(SAMPLE_LLM_PLAN),
            "iteration": int(state.get("iteration") or 0) + 1,
        }

    _patch_nodes(
        monkeypatch,
        explore=explore,
        decompose=decompose,
        generate=_draft_generate(calls),
        critique=critique,
        revise=revise,
    )
    created = client.post(
        "/api/projects",
        json={"name": "High", "thoughtEffort": "high"},
    ).get_json()

    with app.app_context():
        set_openai_api_key("sk-test")
        monkeypatch.setattr(
            "app.planner.job.get_planner",
            lambda: LangGraphPlanner(),
        )
        plan_project(created["id"])

    assert calls == [
        "explore",
        "decompose",
        "generate",
        "critique",
        "revise",
        "critique",
        "revise",
        "critique",
    ]
    ready = client.get(f"/api/projects/{created['id']}").get_json()
    assert ready["planStatus"] == "ready"


def test_max_effort_continues_until_critique_completes(client, app, monkeypatch):
    app.config["PLANNER"] = "openai"
    calls: list[str] = []
    critiques = {"n": 0}

    def explore(_state):
        calls.append("explore")
        return {"research": "notes"}

    def decompose(_state):
        calls.append("decompose")
        return {"outline": "{}"}

    def critique(state):
        calls.append("critique")
        critiques["n"] += 1
        return {
            "critique": {
                "complete": critiques["n"] >= 3,
                "issues": [] if critiques["n"] >= 3 else ["again"],
                "next": "revise",
            },
            "iteration": state.get("iteration") or 0,
        }

    def revise(state):
        calls.append("revise")
        return {
            "draft": json.dumps(SAMPLE_LLM_PLAN),
            "iteration": int(state.get("iteration") or 0) + 1,
        }

    _patch_nodes(
        monkeypatch,
        explore=explore,
        decompose=decompose,
        generate=_draft_generate(calls),
        critique=critique,
        revise=revise,
    )
    created = client.post(
        "/api/projects",
        json={"name": "Max", "thoughtEffort": "max"},
    ).get_json()

    with app.app_context():
        set_openai_api_key("sk-test")
        monkeypatch.setattr(
            "app.planner.job.get_planner",
            lambda: LangGraphPlanner(),
        )
        plan_project(created["id"])

    assert critiques["n"] == 3
    assert calls == [
        "explore",
        "decompose",
        "generate",
        "critique",
        "revise",
        "critique",
        "revise",
        "critique",
    ]
    ready = client.get(f"/api/projects/{created['id']}").get_json()
    assert ready["planStatus"] == "ready"
    with app.app_context():
        assert get_project(created["id"]).thought_effort == "max"

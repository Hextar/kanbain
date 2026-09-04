from app.lookups import get_project
from app.planner.apply import apply_plan
from app.planner.schema import ParsedMilestone, ParsedPlan, ParsedTask
from app.rag.classify import classify_brief
from app.rag.domains import heuristic_classify, normalize_slug
from app.rag.retrieve import retrieve
from app.rag.seed import embed_missing_chunks, ensure_wiki_seeded


def test_heuristic_maps_it_to_software():
    assert normalize_slug("IT") == "software-product"
    classified = heuristic_classify("Build a SaaS kanban app")
    assert classified["domain_slug"] == "software-product"
    assert len(classified["queries"]) >= 3


def test_classify_uses_heuristic_in_tests(app):
    with app.app_context():
        data = classify_brief("Hospital patient intake portal")
    assert data["domain_slug"] == "healthcare"


def test_retrieve_returns_playbook_notes(app):
    with app.app_context():
        ensure_wiki_seeded()
        result = retrieve(
            domain_slug="software-product",
            queries=["work breakdown estimation", "acceptance criteria"],
        )
    assert result.chunks
    assert "Work breakdown" in result.notes or "Acceptance" in result.notes


def test_embed_missing_chunks_query_is_valid(app):
    with app.app_context():
        ensure_wiki_seeded()
        assert embed_missing_chunks(limit=0) == 0


def test_apply_plan_drops_invented_assignees(client, app):
    created = client.post(
        "/api/projects",
        json={"name": "Team", "members": [{"name": "Ada"}]},
    ).get_json()
    with app.app_context():
        apply_plan(
            get_project(created["id"]),
            ParsedPlan(
                title="X",
                milestones=[ParsedMilestone(title="M")],
                tasks=[
                    ParsedTask(title="Epic", work_kind="epic", assignee="Ghost"),
                    ParsedTask(title="Story", work_kind="story", parent_index=0, assignee="Ada"),
                    ParsedTask(title="Leaf", work_kind="task", parent_index=1, assignee="Ada"),
                ],
            ),
            raw="{}",
        )
    tasks = client.get(f"/api/tasks?projectId={created['id']}").get_json()
    by_title = {task["title"]: task for task in tasks}
    assert "assigneeId" not in by_title["Epic"]
    assert by_title["Story"].get("assigneeId")
    assert by_title["Leaf"].get("assigneeId")
    assignees = client.get("/api/assignees").get_json()
    assert [item["name"] for item in assignees] == ["Ada"]

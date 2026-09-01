import json

from app.lookups import get_project
from app.planner.apply import apply_plan
from app.planner.graph import LangGraphPlanner
from app.planner.job import plan_project
from app.planner.keys import set_openai_api_key
from app.planner.openai_planner import MISSING_KEY_MESSAGE
from app.planner.schema import ParsedMilestone, ParsedPlan, ParsedTask
from tests.plan_fixtures import SAMPLE_LLM_PLAN, fake_openai_client


def test_plan_job_populates_the_board(client, app):
    created = client.post(
        "/api/projects",
        json={
            "name": "Launch site",
            "goal": "Ship a marketing site",
            "deadlineKind": "hard",
            "deadlineAt": "2026-12-01T00:00:00Z",
            "members": [{"name": "Ada", "role": "engineer", "seniority": "senior"}],
        },
    )
    project = created.get_json()
    assert project["planStatus"] == "planning"
    project_id = project["id"]

    with app.app_context():
        plan_project(project_id)

    ready = client.get(f"/api/projects/{project_id}").get_json()
    assert ready["planStatus"] == "ready"
    assert "planError" not in ready

    columns = client.get(f"/api/columns?projectId={project_id}").get_json()
    assert [column["title"] for column in columns] == ["To Do", "In Progress", "Done"]
    todo_id = columns[0]["id"]
    tasks = client.get(f"/api/tasks?projectId={project_id}").get_json()
    assert {task["columnId"] for task in tasks} == {todo_id}
    titles = {task["title"] for task in tasks}
    assert "Launch site" in titles
    assert "Capture constraints" in titles
    assert any(task.get("assigneeId") for task in tasks)
    assert all(task.get("milestoneId") for task in tasks)
    assert any(task.get("acceptanceCriteria") for task in tasks)

    milestones = client.get(f"/api/projects/{project_id}/milestones").get_json()
    assert [milestone["title"] for milestone in milestones] == ["Launch"]


def test_plan_job_failure_is_recorded(client, app, monkeypatch):
    created = client.post("/api/projects", json={"name": "Broken"}).get_json()
    project_id = created["id"]

    class BoomPlanner:
        def generate(self, _project):
            raise RuntimeError("planner exploded")

    monkeypatch.setattr("app.planner.job.get_planner", BoomPlanner)
    with app.app_context():
        plan_project(project_id)

    failed = client.get(f"/api/projects/{project_id}").get_json()
    assert failed["planStatus"] == "failed"
    assert "planner exploded" in failed["planError"]

    retry = client.post(f"/api/projects/{project_id}/plan")
    assert retry.status_code == 202
    assert retry.get_json()["planStatus"] == "planning"


def test_openai_planner_populates_the_board(client, app, monkeypatch):
    app.config["PLANNER"] = "openai"
    created = client.post(
        "/api/projects",
        json={
            "name": "Launch site",
            "goal": "Ship a marketing site",
            "deadlineKind": "hard",
            "deadlineAt": "2026-12-01T00:00:00Z",
            "members": [{"name": "Ada", "role": "engineer", "seniority": "senior"}],
            "thoughtEffort": "low",
        },
    ).get_json()
    project_id = created["id"]
    client_stub = fake_openai_client(json.dumps(SAMPLE_LLM_PLAN))
    monkeypatch.setattr(
        "app.planner.job.get_planner",
        lambda: LangGraphPlanner(client=client_stub),
    )

    with app.app_context():
        set_openai_api_key("sk-test")
        plan_project(project_id)

    ready = client.get(f"/api/projects/{project_id}").get_json()
    assert ready["planStatus"] == "ready"
    tasks = client.get(f"/api/tasks?projectId={project_id}").get_json()
    titles = {task["title"] for task in tasks}
    assert "Capture constraints" in titles
    assert "Seed the backlog" in titles
    assert any(task.get("acceptanceCriteria") for task in tasks)
    assert any(task.get("assigneeId") for task in tasks)
    assert all(task.get("milestoneId") for task in tasks)


def test_openai_planner_missing_key_is_recorded(client, app):
    app.config["PLANNER"] = "openai"
    app.config["OPENAI_API_KEY"] = ""
    created = client.post("/api/projects", json={"name": "No key"}).get_json()
    project_id = created["id"]

    with app.app_context():
        plan_project(project_id)

    failed = client.get(f"/api/projects/{project_id}").get_json()
    assert failed["planStatus"] == "failed"
    assert MISSING_KEY_MESSAGE in failed["planError"]


def test_apply_plan_inherits_missing_milestones(client, app):
    project_id = client.get("/api/projects").get_json()[0]["id"]
    with app.app_context():
        apply_plan(
            get_project(project_id),
            ParsedPlan(
                title="Inherit",
                milestones=[ParsedMilestone(title="Beta")],
                tasks=[
                    ParsedTask(title="Epic", work_kind="epic"),
                    ParsedTask(title="Story", work_kind="story", parent_index=0),
                    ParsedTask(title="Leaf", work_kind="task", parent_index=1),
                ],
            ),
            raw="{}",
        )
    tasks = client.get(f"/api/tasks?projectId={project_id}").get_json()
    assert len(tasks) == 3
    assert all(task.get("milestoneId") for task in tasks)
    assert len({task["milestoneId"] for task in tasks}) == 1

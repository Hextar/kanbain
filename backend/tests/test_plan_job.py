from app.planner.job import plan_project


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
    assert any(task.get("milestoneId") for task in tasks)
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

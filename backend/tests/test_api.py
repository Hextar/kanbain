def default_project(client):
    return client.get("/api/projects").get_json()[0]


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_lists_seeded_project_and_columns(client):
    project = default_project(client)
    assert project["name"] == "Untitled project"
    assert project["deadlineKind"] == "ongoing"
    assert project["methodology"] == "kanban"
    assert project["members"] == []

    response = client.get("/api/columns")
    assert response.status_code == 200
    columns = response.get_json()
    assert [column["title"] for column in columns] == ["To Do", "In Progress", "Done"]
    assert [column["order"] for column in columns] == [0, 1, 2]
    assert {column["projectId"] for column in columns} == {project["id"]}


def test_create_column(client):
    response = client.post("/api/columns", json={"title": "Review"})
    assert response.status_code == 201
    column = response.get_json()
    assert column["title"] == "Review"
    assert column["order"] == 3
    assert column["id"]
    assert column["projectId"] == default_project(client)["id"]


def test_create_and_filter_tasks(client):
    columns = client.get("/api/columns").get_json()
    todo_id = columns[0]["id"]
    doing_id = columns[1]["id"]

    created = client.post(
        "/api/tasks",
        json={
            "title": "Write API",
            "columnId": todo_id,
            "priority": "high",
            "category": "backend",
        },
    )
    assert created.status_code == 201
    task = created.get_json()
    assert task["title"] == "Write API"
    assert task["columnId"] == todo_id
    assert task["projectId"] == default_project(client)["id"]
    assert task["workKind"] == "task"
    assert task["createdAt"]

    client.post("/api/tasks", json={"title": "Other", "columnId": doing_id})

    filtered = client.get(f"/api/tasks?columnId={todo_id}&priority=high")
    assert filtered.status_code == 200
    assert [item["title"] for item in filtered.get_json()] == ["Write API"]


def test_task_crud(client):
    todo_id = client.get("/api/columns").get_json()[0]["id"]
    created = client.post(
        "/api/tasks",
        json={"id": "11111111-1111-1111-1111-111111111111", "title": "Card", "columnId": todo_id},
    )
    task_id = created.get_json()["id"]
    assert task_id == "11111111-1111-1111-1111-111111111111"

    fetched = client.get(f"/api/tasks/{task_id}")
    assert fetched.status_code == 200
    assert fetched.get_json()["title"] == "Card"

    updated = client.put(
        f"/api/tasks/{task_id}",
        json={"title": "Updated card", "columnId": todo_id, "priority": "low"},
    )
    assert updated.status_code == 200
    body = updated.get_json()
    assert body["title"] == "Updated card"
    assert body["priority"] == "low"
    assert body["updatedAt"]

    deleted = client.delete(f"/api/tasks/{task_id}")
    assert deleted.status_code == 204
    assert client.get(f"/api/tasks/{task_id}").status_code == 404


def test_unknown_column_is_rejected(client):
    response = client.post(
        "/api/tasks",
        json={"title": "Orphan", "columnId": "00000000-0000-0000-0000-000000000000"},
    )
    assert response.status_code == 400
    assert response.get_json()["message"] == "Unknown column"


def test_missing_task_returns_404(client):
    response = client.get("/api/tasks/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


def test_delete_missing_task_is_idempotent(client):
    response = client.delete("/api/tasks/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 204


def test_create_project_with_wizard_fields(client):
    response = client.post(
        "/api/projects",
        json={
            "name": "KanbAIn",
            "goal": "Plan work onto a board",
            "prdUrl": "https://example.com/prd",
            "designUrls": ["https://example.com/figma"],
            "repoUrl": "https://github.com/Hextar/kanbain",
            "deadlineKind": "hard",
            "deadlineAt": "2026-12-01T00:00:00Z",
            "methodology": "kanban",
            "qualityBar": "mvp",
            "riskTolerance": "medium",
            "members": [
                {"name": "Ada", "role": "engineer", "seniority": "senior", "capacity": 1},
            ],
        },
    )
    assert response.status_code == 201
    project = response.get_json()
    assert project["name"] == "KanbAIn"
    assert project["deadlineKind"] == "hard"
    assert project["qualityBar"] == "mvp"
    assert [member["name"] for member in project["members"]] == ["Ada"]
    assert project["members"][0]["capacity"] == 1


def test_columns_are_scoped_to_a_project(client):
    other = client.post("/api/projects", json={"name": "Other"}).get_json()
    created = client.post(
        "/api/columns",
        json={"title": "Backlog", "projectId": other["id"]},
    )
    assert created.status_code == 201
    assert created.get_json()["projectId"] == other["id"]

    listed = client.get(f"/api/columns?projectId={other['id']}")
    assert [column["title"] for column in listed.get_json()] == ["Backlog"]
    assert client.get("/api/columns").status_code == 400


def test_task_planning_fields(client):
    project_id = default_project(client)["id"]
    member = client.post(
        f"/api/projects/{project_id}/members",
        json={"name": "Ada", "role": "engineer", "seniority": "senior"},
    ).get_json()
    milestone = client.post(
        f"/api/projects/{project_id}/milestones",
        json={"title": "Beta"},
    ).get_json()
    todo_id = client.get("/api/columns").get_json()[0]["id"]

    epic = client.post(
        "/api/tasks",
        json={"title": "Board", "columnId": todo_id, "workKind": "epic"},
    ).get_json()
    story = client.post(
        "/api/tasks",
        json={
            "title": "Persist cards",
            "columnId": todo_id,
            "workKind": "story",
            "parentId": epic["id"],
        },
    ).get_json()
    task = client.post(
        "/api/tasks",
        json={
            "title": "Write migration",
            "columnId": todo_id,
            "parentId": story["id"],
            "acceptanceCriteria": ["Schema includes project_id"],
            "estimateTshirt": "m",
            "estimatePoints": 3,
            "estimateHours": 4,
            "assigneeId": member["id"],
            "milestoneId": milestone["id"],
            "dependsOn": [story["id"]],
        },
    ).get_json()

    assert task["parentId"] == story["id"]
    assert task["acceptanceCriteria"] == ["Schema includes project_id"]
    assert task["estimateTshirt"] == "m"
    assert task["estimatePoints"] == 3
    assert task["estimateHours"] == 4
    assert task["assigneeId"] == member["id"]
    assert task["milestoneId"] == milestone["id"]
    assert task["dependsOn"] == [story["id"]]

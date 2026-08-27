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
    assert project["planStatus"] == "ready"

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


def test_column_title_update_and_delete(client):
    columns = client.get("/api/columns").get_json()
    todo_id = columns[0]["id"]
    doing_id = columns[1]["id"]
    client.post("/api/tasks", json={"title": "Card", "columnId": todo_id})

    renamed = client.put(f"/api/columns/{todo_id}", json={"title": "Backlog"})
    assert renamed.status_code == 200
    assert renamed.get_json()["title"] == "Backlog"
    assert renamed.get_json()["order"] == 0

    deleted = client.delete(f"/api/columns/{todo_id}")
    assert deleted.status_code == 204
    remaining = client.get("/api/columns").get_json()
    assert [column["id"] for column in remaining] == [doing_id, columns[2]["id"]]
    assert client.get("/api/tasks").get_json() == []
    assert client.delete("/api/columns/00000000-0000-0000-0000-000000000000").status_code == 204


def test_project_name_update_and_delete(client):
    project = default_project(client)
    renamed = client.put(f"/api/projects/{project['id']}", json={"name": "KanbAIn"})
    assert renamed.status_code == 200
    assert renamed.get_json()["name"] == "KanbAIn"
    assert renamed.get_json()["deadlineKind"] == "ongoing"

    deleted = client.delete(f"/api/projects/{project['id']}")
    assert deleted.status_code == 204
    assert client.get("/api/projects").get_json() == []
    assert client.delete(f"/api/projects/{project['id']}").status_code == 204


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


def test_move_task_to_another_column(client):
    columns = client.get("/api/columns").get_json()
    todo_id = columns[0]["id"]
    doing_id = columns[1]["id"]

    created = client.post(
        "/api/tasks",
        json={"title": "Move me", "columnId": todo_id, "priority": "high"},
    )
    assert created.status_code == 201
    task = created.get_json()
    task_id = task["id"]

    moved = client.put(f"/api/tasks/{task_id}", json={"columnId": doing_id})
    assert moved.status_code == 200
    body = moved.get_json()
    assert body["columnId"] == doing_id
    assert body["title"] == "Move me"
    assert body["priority"] == "high"
    assert body["projectId"] == default_project(client)["id"]

    todo_tasks = client.get(f"/api/tasks?columnId={todo_id}").get_json()
    doing_tasks = client.get(f"/api/tasks?columnId={doing_id}").get_json()
    assert [item["id"] for item in todo_tasks] == []
    assert [item["id"] for item in doing_tasks] == [task_id]


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
    assert project["planStatus"] == "planning"
    columns = client.get(f"/api/columns?projectId={project['id']}").get_json()
    assert [column["title"] for column in columns] == ["To Do", "In Progress", "Done"]


def test_columns_are_scoped_to_a_project(client):
    other = client.post("/api/projects", json={"name": "Other"}).get_json()
    created = client.post(
        "/api/columns",
        json={"title": "Backlog", "projectId": other["id"]},
    )
    assert created.status_code == 201
    assert created.get_json()["projectId"] == other["id"]

    listed = client.get(f"/api/columns?projectId={other['id']}")
    titles = [column["title"] for column in listed.get_json()]
    assert titles[:3] == ["To Do", "In Progress", "Done"]
    assert titles[-1] == "Backlog"
    assert client.get("/api/columns").status_code == 400


def test_task_planning_fields(client):
    project_id = default_project(client)["id"]
    assignee = client.post(
        "/api/assignees",
        json={"name": "Senior Frontend Developer"},
    ).get_json()
    tag = client.post("/api/tags", json={"name": "frontend"}).get_json()
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
            "priority": "high",
            "assigneeId": assignee["id"],
            "milestoneId": milestone["id"],
            "tags": [tag["name"]],
            "dependsOn": [story["id"]],
        },
    ).get_json()

    assert task["parentId"] == story["id"]
    assert task["acceptanceCriteria"] == ["Schema includes project_id"]
    assert task["estimateTshirt"] == "m"
    assert task["estimatePoints"] == 3
    assert task["estimateHours"] == 4
    assert task["priority"] == "high"
    assert task["assigneeId"] == assignee["id"]
    assert task["milestoneId"] == milestone["id"]
    assert task["tags"] == ["frontend"]
    assert task["dependsOn"] == [story["id"]]


def test_global_assignees_and_tags(client):
    assert client.get("/api/assignees").get_json() == []
    assert client.get("/api/tags").get_json() == []

    created_assignee = client.post(
        "/api/assignees",
        json={"name": "Full Stack Developer"},
    )
    assert created_assignee.status_code == 201
    assert created_assignee.get_json()["name"] == "Full Stack Developer"
    assert [item["name"] for item in client.get("/api/assignees").get_json()] == [
        "Full Stack Developer"
    ]
    assert (
        client.post("/api/assignees", json={"name": "Full Stack Developer"}).status_code
        == 409
    )

    created_tag = client.post("/api/tags", json={"name": "design"})
    assert created_tag.status_code == 201
    assert [item["name"] for item in client.get("/api/tags").get_json()] == ["design"]

    todo_id = client.get("/api/columns").get_json()[0]["id"]
    missing = client.post(
        "/api/tasks",
        json={"title": "Needs tag", "columnId": todo_id, "tags": ["missing"]},
    )
    assert missing.status_code == 400

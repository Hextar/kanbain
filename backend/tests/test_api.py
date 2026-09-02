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
    assert project["thoughtEffort"] == "medium"
    assert project["taskCount"] == 0
    assert project["completedCount"] == 0
    assert "planPhase" not in project

    response = client.get("/api/columns")
    assert response.status_code == 200
    columns = response.get_json()
    assert [column["title"] for column in columns] == ["To Do", "In Progress", "Done"]
    assert [column["order"] for column in columns] == [0, 1, 2]
    assert [column["color"] for column in columns] == ["sky", "amber", "emerald"]
    assert {column["projectId"] for column in columns} == {project["id"]}


def test_create_column(client):
    response = client.post("/api/columns", json={"title": "Review"})
    assert response.status_code == 201
    column = response.get_json()
    assert column["title"] == "Review"
    assert column["order"] == 3
    assert column["color"] == "fuchsia"
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
    assert task["number"] == 1
    assert task["createdAt"]
    assert task["order"] == 0

    client.post("/api/tasks", json={"title": "Other", "columnId": doing_id})

    filtered = client.get(f"/api/tasks?columnId={todo_id}&priority=high")
    assert filtered.status_code == 200
    assert [item["title"] for item in filtered.get_json()] == ["Write API"]


def test_project_completion_counts_done_column(client):
    columns = client.get("/api/columns").get_json()
    todo_id = columns[0]["id"]
    done_id = columns[-1]["id"]
    client.post("/api/tasks", json={"title": "Backlog", "columnId": todo_id})
    client.post("/api/tasks", json={"title": "Shipped", "columnId": done_id})
    client.post("/api/tasks", json={"title": "Also shipped", "columnId": done_id})

    project = default_project(client)
    assert project["taskCount"] == 3
    assert project["completedCount"] == 2
    fetched = client.get(f"/api/projects/{project['id']}")
    assert fetched.status_code == 200
    assert fetched.get_json()["taskCount"] == 3
    assert fetched.get_json()["completedCount"] == 2


def test_list_tasks_by_column_when_multiple_projects_exist(client):
    first = default_project(client)
    second = client.post("/api/projects", json={"name": "Second"}).get_json()
    columns = client.get(f"/api/columns?projectId={first['id']}").get_json()
    todo_id = columns[0]["id"]
    client.post("/api/tasks", json={"title": "From first", "columnId": todo_id})

    by_column = client.get(f"/api/tasks?columnId={todo_id}")
    assert by_column.status_code == 200
    assert [item["title"] for item in by_column.get_json()] == ["From first"]

    by_project = client.get(f"/api/tasks?projectId={first['id']}&columnId={todo_id}")
    assert by_project.status_code == 200
    assert [item["title"] for item in by_project.get_json()] == ["From first"]

    other = client.get(f"/api/tasks?projectId={second['id']}")
    assert other.status_code == 200
    assert other.get_json() == []


def test_reorder_column(client):
    columns = client.get("/api/columns").get_json()
    first_id = columns[0]["id"]
    last = columns[2]

    moved = client.put(f"/api/columns/{last['id']}", json={"order": 0})
    assert moved.status_code == 200
    assert moved.get_json()["order"] == 0
    assert moved.get_json()["title"] == last["title"]

    listed = client.get("/api/columns").get_json()
    assert [column["title"] for column in listed] == ["Done", "To Do", "In Progress"]
    assert [column["order"] for column in listed] == [0, 1, 2]
    assert listed[1]["id"] == first_id


def test_reorder_column_clamps_order(client):
    first_id = client.get("/api/columns").get_json()[0]["id"]
    moved = client.put(f"/api/columns/{first_id}", json={"order": 99})
    assert moved.status_code == 200
    assert moved.get_json()["order"] == 2

    listed = client.get("/api/columns").get_json()
    assert [column["title"] for column in listed] == ["In Progress", "Done", "To Do"]
    assert [column["order"] for column in listed] == [0, 1, 2]
    assert listed[2]["id"] == first_id


def test_column_title_update_and_delete(client):
    columns = client.get("/api/columns").get_json()
    todo_id = columns[0]["id"]
    doing_id = columns[1]["id"]
    client.post("/api/tasks", json={"title": "Card", "columnId": todo_id})

    renamed = client.put(f"/api/columns/{todo_id}", json={"title": "Backlog"})
    assert renamed.status_code == 200
    assert renamed.get_json()["title"] == "Backlog"
    assert renamed.get_json()["order"] == 0
    assert renamed.get_json()["color"] == "sky"

    recolored = client.put(f"/api/columns/{todo_id}", json={"color": "violet"})
    assert recolored.status_code == 200
    assert recolored.get_json()["color"] == "violet"
    assert recolored.get_json()["title"] == "Backlog"
    assert client.put(f"/api/columns/{todo_id}", json={"color": "chartreuse"}).status_code == 400

    deleted = client.delete(f"/api/columns/{todo_id}")
    assert deleted.status_code == 204
    remaining = client.get("/api/columns").get_json()
    assert [column["id"] for column in remaining] == [doing_id, columns[2]["id"]]
    assert client.get("/api/tasks").get_json() == []
    assert client.delete("/api/columns/00000000-0000-0000-0000-000000000000").status_code == 204


def test_projects_list_newest_first(client):
    older = default_project(client)
    newer = client.post("/api/projects", json={"name": "Newest"}).get_json()
    names = [project["name"] for project in client.get("/api/projects").get_json()]
    assert names[0] == newer["name"]
    assert older["name"] in names


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


def test_delete_task_deletes_nested_cards(client):
    todo_id = client.get("/api/columns").get_json()[0]["id"]
    parent = client.post(
        "/api/tasks",
        json={"title": "Story", "columnId": todo_id},
    ).get_json()
    child = client.post(
        "/api/tasks",
        json={"title": "Nested", "columnId": todo_id, "parentId": parent["id"]},
    ).get_json()
    sibling = client.post(
        "/api/tasks",
        json={"title": "Stay", "columnId": todo_id},
    ).get_json()

    deleted = client.delete(f"/api/tasks/{parent['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/tasks/{parent['id']}").status_code == 404
    assert client.get(f"/api/tasks/{child['id']}").status_code == 404
    stayed = client.get(f"/api/tasks/{sibling['id']}")
    assert stayed.status_code == 200
    assert stayed.get_json()["id"] == sibling["id"]


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
    assert body["order"] == 0

    todo_tasks = client.get(f"/api/tasks?columnId={todo_id}").get_json()
    doing_tasks = client.get(f"/api/tasks?columnId={doing_id}").get_json()
    assert [item["id"] for item in todo_tasks] == []
    assert [item["id"] for item in doing_tasks] == [task_id]


def test_task_order_assigned_and_sorted(client):
    todo_id = client.get("/api/columns").get_json()[0]["id"]
    first = client.post("/api/tasks", json={"title": "First", "columnId": todo_id}).get_json()
    second = client.post("/api/tasks", json={"title": "Second", "columnId": todo_id}).get_json()
    third = client.post("/api/tasks", json={"title": "Third", "columnId": todo_id}).get_json()
    assert [first["order"], second["order"], third["order"]] == [0, 1, 2]

    listed = client.get(f"/api/tasks?columnId={todo_id}").get_json()
    assert [item["title"] for item in listed] == ["First", "Second", "Third"]


def test_reorder_task_within_column(client):
    todo_id = client.get("/api/columns").get_json()[0]["id"]
    first = client.post("/api/tasks", json={"title": "First", "columnId": todo_id}).get_json()
    client.post("/api/tasks", json={"title": "Second", "columnId": todo_id})
    third = client.post("/api/tasks", json={"title": "Third", "columnId": todo_id}).get_json()

    moved = client.put(f"/api/tasks/{third['id']}", json={"order": 0})
    assert moved.status_code == 200
    assert moved.get_json()["order"] == 0

    listed = client.get(f"/api/tasks?columnId={todo_id}").get_json()
    assert [item["title"] for item in listed] == ["Third", "First", "Second"]
    assert [item["order"] for item in listed] == [0, 1, 2]
    assert listed[1]["id"] == first["id"]


def test_noop_task_put_preserves_updated_at(client):
    todo_id = client.get("/api/columns").get_json()[0]["id"]
    created = client.post(
        "/api/tasks", json={"title": "Stay", "columnId": todo_id}
    ).get_json()
    renamed = client.put(
        f"/api/tasks/{created['id']}",
        json={"title": "Stay put", "columnId": todo_id},
    ).get_json()
    stamped = renamed["updatedAt"]
    assert stamped

    same = client.put(
        f"/api/tasks/{created['id']}",
        json={
            "title": "Stay put",
            "columnId": todo_id,
            "order": renamed["order"],
        },
    ).get_json()
    assert same["updatedAt"] == stamped
    assert same["order"] == renamed["order"]

    client.post("/api/tasks", json={"title": "Other", "columnId": todo_id})
    moved = client.put(f"/api/tasks/{created['id']}", json={"order": 1}).get_json()
    assert moved["order"] == 1
    assert moved["updatedAt"] != stamped


def test_update_task_keeps_order_when_column_unchanged(client):
    todo_id = client.get("/api/columns").get_json()[0]["id"]
    first = client.post("/api/tasks", json={"title": "First", "columnId": todo_id}).get_json()
    client.post("/api/tasks", json={"title": "Second", "columnId": todo_id})
    client.post("/api/tasks", json={"title": "Third", "columnId": todo_id})

    updated = client.put(
        f"/api/tasks/{first['id']}",
        json={"title": "Renamed", "columnId": todo_id},
    )
    assert updated.status_code == 200
    assert updated.get_json()["order"] == 0

    listed = client.get(f"/api/tasks?columnId={todo_id}").get_json()
    assert [item["title"] for item in listed] == ["Renamed", "Second", "Third"]
    assert [item["order"] for item in listed] == [0, 1, 2]


def test_move_task_to_column_at_index(client):
    columns = client.get("/api/columns").get_json()
    todo_id = columns[0]["id"]
    doing_id = columns[1]["id"]

    client.post("/api/tasks", json={"title": "Keep", "columnId": doing_id})
    client.post("/api/tasks", json={"title": "Tail", "columnId": doing_id})
    incoming = client.post(
        "/api/tasks", json={"title": "Incoming", "columnId": todo_id}
    ).get_json()

    moved = client.put(
        f"/api/tasks/{incoming['id']}",
        json={"columnId": doing_id, "order": 1},
    )
    assert moved.status_code == 200
    assert moved.get_json()["columnId"] == doing_id
    assert moved.get_json()["order"] == 1

    doing_tasks = client.get(f"/api/tasks?columnId={doing_id}").get_json()
    assert [item["title"] for item in doing_tasks] == ["Keep", "Incoming", "Tail"]
    assert [item["order"] for item in doing_tasks] == [0, 1, 2]
    todo_tasks = client.get(f"/api/tasks?columnId={todo_id}").get_json()
    assert todo_tasks == []


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
    assert project["thoughtEffort"] == "medium"
    assert "planPhase" not in project
    columns = client.get(f"/api/columns?projectId={project['id']}").get_json()
    assert [column["title"] for column in columns] == ["To Do", "In Progress", "Done"]


def test_create_empty_project_skips_planning(client):
    response = client.post(
        "/api/projects",
        json={"name": "Blank board", "skipPlan": True},
    )
    assert response.status_code == 201
    project = response.get_json()
    assert project["name"] == "Blank board"
    assert project["planStatus"] == "ready"
    assert project["thoughtEffort"] == "medium"
    assert "planError" not in project
    columns = client.get(f"/api/columns?projectId={project['id']}").get_json()
    assert [column["title"] for column in columns] == ["To Do", "In Progress", "Done"]
    tasks = client.get(f"/api/tasks?projectId={project['id']}").get_json()
    assert tasks == []


def test_skip_plan_must_be_boolean(client):
    response = client.post(
        "/api/projects",
        json={"name": "Bad flag", "skipPlan": "yes"},
    )
    assert response.status_code == 400
    assert response.get_json()["message"] == "skipPlan must be a boolean"


def test_create_project_stores_thought_effort(client):
    response = client.post(
        "/api/projects",
        json={"name": "Deep think", "thoughtEffort": "max"},
    )
    assert response.status_code == 201
    project = response.get_json()
    assert project["thoughtEffort"] == "max"
    assert project["planStatus"] == "planning"


def test_create_rejects_unknown_thought_effort(client):
    response = client.post(
        "/api/projects",
        json={"name": "Bad effort", "thoughtEffort": "extreme"},
    )
    assert response.status_code == 400
    assert "thoughtEffort must be one of" in response.get_json()["message"]


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


def test_moving_a_leaf_does_not_move_its_parent(client):
    columns = client.get("/api/columns").get_json()
    todo_id = columns[0]["id"]
    doing_id = columns[1]["id"]
    done_id = columns[2]["id"]
    story = client.post(
        "/api/tasks",
        json={"title": "Story", "columnId": todo_id, "workKind": "story"},
    ).get_json()
    first = client.post(
        "/api/tasks",
        json={
            "title": "First leaf",
            "columnId": todo_id,
            "parentId": story["id"],
        },
    ).get_json()
    client.post(
        "/api/tasks",
        json={
            "title": "Second leaf",
            "columnId": todo_id,
            "parentId": story["id"],
        },
    )

    moved = client.put(
        f"/api/tasks/{first['id']}",
        json={**first, "columnId": doing_id},
    ).get_json()
    parent = client.get(f"/api/tasks/{story['id']}").get_json()
    assert moved["columnId"] == doing_id
    assert moved["parentId"] == story["id"]
    assert parent["columnId"] == todo_id

    client.put(f"/api/tasks/{first['id']}", json={**moved, "columnId": done_id})
    still_open = client.get(f"/api/tasks/{story['id']}").get_json()
    assert still_open["columnId"] == todo_id


def test_moving_a_story_moves_same_column_children(client):
    columns = client.get("/api/columns").get_json()
    todo_id = columns[0]["id"]
    doing_id = columns[1]["id"]
    done_id = columns[2]["id"]
    story = client.post(
        "/api/tasks",
        json={"title": "Story", "columnId": todo_id, "workKind": "story"},
    ).get_json()
    first = client.post(
        "/api/tasks",
        json={
            "title": "First leaf",
            "columnId": todo_id,
            "parentId": story["id"],
        },
    ).get_json()
    second = client.post(
        "/api/tasks",
        json={
            "title": "Second leaf",
            "columnId": todo_id,
            "parentId": story["id"],
        },
    ).get_json()
    elsewhere = client.post(
        "/api/tasks",
        json={
            "title": "Already in progress",
            "columnId": doing_id,
            "parentId": story["id"],
        },
    ).get_json()

    moved = client.put(
        f"/api/tasks/{story['id']}",
        json={**story, "columnId": done_id},
    ).get_json()
    assert moved["columnId"] == done_id
    assert client.get(f"/api/tasks/{first['id']}").get_json()["columnId"] == done_id
    assert client.get(f"/api/tasks/{second['id']}").get_json()["columnId"] == done_id
    assert client.get(f"/api/tasks/{first['id']}").get_json()["parentId"] == story["id"]
    assert client.get(f"/api/tasks/{second['id']}").get_json()["parentId"] == story["id"]
    stayed = client.get(f"/api/tasks/{elsewhere['id']}").get_json()
    assert stayed["columnId"] == doing_id
    assert stayed["parentId"] == story["id"]


def test_parent_completes_when_all_leaves_are_done(client):
    columns = client.get("/api/columns").get_json()
    todo_id = columns[0]["id"]
    done_id = columns[2]["id"]
    epic = client.post(
        "/api/tasks",
        json={"title": "Epic", "columnId": todo_id, "workKind": "epic"},
    ).get_json()
    story = client.post(
        "/api/tasks",
        json={
            "title": "Story",
            "columnId": todo_id,
            "workKind": "story",
            "parentId": epic["id"],
        },
    ).get_json()
    first = client.post(
        "/api/tasks",
        json={
            "title": "First leaf",
            "columnId": todo_id,
            "parentId": story["id"],
        },
    ).get_json()
    second = client.post(
        "/api/tasks",
        json={
            "title": "Second leaf",
            "columnId": todo_id,
            "parentId": story["id"],
        },
    ).get_json()

    client.put(f"/api/tasks/{first['id']}", json={**first, "columnId": done_id})
    assert client.get(f"/api/tasks/{story['id']}").get_json()["columnId"] == todo_id
    assert client.get(f"/api/tasks/{epic['id']}").get_json()["columnId"] == todo_id

    client.put(f"/api/tasks/{second['id']}", json={**second, "columnId": done_id})
    assert client.get(f"/api/tasks/{story['id']}").get_json()["columnId"] == done_id
    assert client.get(f"/api/tasks/{epic['id']}").get_json()["columnId"] == done_id


def test_task_numbers_are_sequential_per_project(client):
    todo_id = client.get("/api/columns").get_json()[0]["id"]
    first = client.post("/api/tasks", json={"title": "One", "columnId": todo_id}).get_json()
    second = client.post("/api/tasks", json={"title": "Two", "columnId": todo_id}).get_json()
    assert [first["number"], second["number"]] == [1, 2]

    other = client.post("/api/projects", json={"name": "Other", "skipPlan": True}).get_json()
    other_todo = client.get(f"/api/columns?projectId={other['id']}").get_json()[0]["id"]
    other_task = client.post(
        "/api/tasks",
        json={"title": "Other one", "columnId": other_todo},
    ).get_json()
    assert other_task["number"] == 1


def test_nesting_promotes_a_root_leaf_and_rejects_a_third_level(client):
    todo_id = client.get("/api/columns").get_json()[0]["id"]
    parent = client.post(
        "/api/tasks",
        json={"title": "Soon a story", "columnId": todo_id},
    ).get_json()
    child = client.post(
        "/api/tasks",
        json={"title": "Leaf", "columnId": todo_id, "parentId": parent["id"]},
    ).get_json()
    assert child["parentId"] == parent["id"]
    assert child["workKind"] == "task"
    assert client.get(f"/api/tasks/{parent['id']}").get_json()["workKind"] == "story"

    grandchild = client.post(
        "/api/tasks",
        json={"title": "Too deep", "columnId": todo_id, "parentId": child["id"]},
    )
    assert grandchild.status_code == 400

    unnested = client.put(
        f"/api/tasks/{child['id']}",
        json={**child, "parentId": None},
    ).get_json()
    assert unnested["parentId"] is None
    assert unnested["workKind"] == "task"
    assert client.get(f"/api/tasks/{parent['id']}").get_json()["workKind"] == "task"


def test_cannot_nest_a_story_with_children_under_another_story(client):
    todo_id = client.get("/api/columns").get_json()[0]["id"]
    story = client.post(
        "/api/tasks",
        json={"title": "Story", "columnId": todo_id, "workKind": "story"},
    ).get_json()
    other = client.post(
        "/api/tasks",
        json={"title": "Other story", "columnId": todo_id, "workKind": "story"},
    ).get_json()
    client.post(
        "/api/tasks",
        json={"title": "Child", "columnId": todo_id, "parentId": story["id"]},
    )
    nested = client.put(
        f"/api/tasks/{story['id']}",
        json={**story, "parentId": other["id"]},
    )
    assert nested.status_code == 400

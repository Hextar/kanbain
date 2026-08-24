def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_lists_seeded_columns(client):
    response = client.get("/api/columns")
    assert response.status_code == 200
    columns = response.get_json()
    assert [column["title"] for column in columns] == ["To Do", "In Progress", "Done"]
    assert [column["order"] for column in columns] == [0, 1, 2]


def test_create_column(client):
    response = client.post("/api/columns", json={"title": "Review"})
    assert response.status_code == 201
    column = response.get_json()
    assert column["title"] == "Review"
    assert column["order"] == 3
    assert column["id"]


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

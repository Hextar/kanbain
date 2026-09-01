from __future__ import annotations

import json

from simple_websocket import ConnectionClosed

from app.realtime.bus import envelope
from app.realtime.rooms import project_channel, project_id_from_channel
from app.realtime.ws import handle_socket


def test_project_channel():
    assert project_channel("abc") == "kanbain:room:project:abc"
    assert project_id_from_channel("kanbain:room:project:abc") == "abc"
    assert project_id_from_channel("other") is None


def test_envelope_shape():
    body = envelope("plan.updated", "abc", {"planStatus": "planning"})
    assert body == {
        "v": 1,
        "event": "plan.updated",
        "projectId": "abc",
        "origin": None,
        "payload": {"planStatus": "planning"},
    }


def test_subscribe_sends_plan_snapshot(app, client):
    project_id = client.get("/api/projects").get_json()[0]["id"]

    class FakeSocket:
        def __init__(self):
            self.sent: list[str] = []
            self._frames = [json.dumps({"type": "subscribe", "projectId": project_id})]

        def receive(self, timeout=None):
            if not self._frames:
                raise ConnectionClosed()
            return self._frames.pop(0)

        def send(self, data):
            self.sent.append(data)

    fake = FakeSocket()
    with app.app_context():
        handle_socket(fake)

    assert len(fake.sent) == 1
    payload = json.loads(fake.sent[0])
    assert payload["event"] == "plan.updated"
    assert payload["projectId"] == project_id
    assert payload["payload"]["planStatus"] == "ready"


def test_task_commit_emits_board_event(app, client, monkeypatch):
    seen: list[tuple] = []
    monkeypatch.setattr(
        "app.realtime.hooks.publish_project_event",
        lambda project_id, event, payload=None: seen.append((project_id, event)),
    )
    project_id = client.get("/api/projects").get_json()[0]["id"]
    columns = client.get(f"/api/columns?projectId={project_id}").get_json()
    response = client.post(
        "/api/tasks",
        json={"title": "Live card", "columnId": columns[0]["id"]},
    )
    assert response.status_code == 201
    assert (project_id, "board.updated") in seen

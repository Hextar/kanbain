from __future__ import annotations

import json
from typing import Any

from flask import current_app, has_request_context, request
from redis import Redis

from .rooms import CLIENT_HEADER, project_channel


def plan_payload(project) -> dict[str, Any]:
    return {
        "planStatus": project.plan_status,
        "planPhase": project.plan_phase,
        "planError": project.plan_error if project.plan_status == "failed" else None,
    }


def publish_project_event(
    project_id: str,
    event: str,
    payload: dict[str, Any] | None = None,
) -> None:
    body = envelope(event, project_id, payload or {}, origin=_request_origin())
    _publish(project_channel(project_id), body)


def envelope(
    event: str,
    project_id: str,
    payload: dict[str, Any],
    *,
    origin: str | None = None,
) -> dict[str, Any]:
    return {
        "v": 1,
        "event": event,
        "projectId": project_id,
        "origin": origin,
        "payload": payload,
    }


def _request_origin() -> str | None:
    if not has_request_context():
        return None
    value = request.headers.get(CLIENT_HEADER)
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    return stripped or None


def _publish(channel: str, body: dict[str, Any]) -> None:
    if current_app.config.get("TESTING"):
        return
    try:
        client = Redis.from_url(current_app.config["REDIS_URL"])
        client.publish(channel, json.dumps(body))
        client.close()
    except Exception:
        current_app.logger.warning("realtime publish failed", exc_info=True)

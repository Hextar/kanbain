from __future__ import annotations

import json
import queue
import threading

from flask import current_app
from flask_sock import Sock
from redis import Redis
from simple_websocket import ConnectionClosed

from ..lookups import UnknownEntityError, get_project
from .bus import envelope, plan_payload
from .rooms import project_id_from_channel, room_pattern

RECEIVE_TIMEOUT = 0.25


def register_sock(sock: Sock) -> None:
    @sock.route("/ws")
    def websocket(ws) -> None:
        handle_socket(ws)


def handle_socket(ws) -> None:
    wanted: set[str] = set()
    lock = threading.Lock()
    outgoing: queue.Queue[str] = queue.Queue()
    stop = threading.Event()
    pump: threading.Thread | None = None

    if not current_app.config.get("TESTING"):
        redis_url = current_app.config["REDIS_URL"]
        pump = threading.Thread(
            target=_pump_redis,
            args=(redis_url, wanted, lock, outgoing, stop),
            daemon=True,
        )
        pump.start()

    try:
        while True:
            _flush_outgoing(ws, outgoing)
            incoming = _receive(ws)
            if incoming is None:
                continue
            _handle_frame(ws, incoming, wanted, lock)
    except ConnectionClosed:
        return
    finally:
        stop.set()
        if pump is not None:
            pump.join(timeout=1)


def _receive(ws) -> str | None:
    try:
        frame = ws.receive(timeout=RECEIVE_TIMEOUT)
    except TimeoutError:
        return None
    if frame is None:
        raise ConnectionClosed()
    return _as_text(frame)


def _flush_outgoing(ws, outgoing: queue.Queue[str]) -> None:
    while True:
        try:
            ws.send(outgoing.get_nowait())
        except queue.Empty:
            return


def _handle_frame(ws, incoming: str, wanted: set[str], lock: threading.Lock) -> None:
    try:
        data = json.loads(incoming)
    except json.JSONDecodeError:
        ws.send(json.dumps({"v": 1, "event": "error", "message": "invalid json"}))
        return
    if not isinstance(data, dict):
        return
    kind = data.get("type")
    if kind == "ping":
        ws.send(json.dumps({"v": 1, "event": "pong"}))
        return
    project_id = data.get("projectId")
    if not isinstance(project_id, str) or not project_id:
        return
    if kind == "subscribe":
        with lock:
            wanted.add(project_id)
        _send_snapshot(ws, project_id)
        return
    if kind == "unsubscribe":
        with lock:
            wanted.discard(project_id)


def _send_snapshot(ws, project_id: str) -> None:
    try:
        project = get_project(project_id)
    except UnknownEntityError:
        ws.send(
            json.dumps(envelope("error", project_id, {"message": "unknown project"}))
        )
        return
    ws.send(json.dumps(envelope("plan.updated", project.id, plan_payload(project))))


def _pump_redis(
    redis_url: str,
    wanted: set[str],
    lock: threading.Lock,
    outgoing: queue.Queue[str],
    stop: threading.Event,
) -> None:
    client = Redis.from_url(redis_url)
    pubsub = client.pubsub()
    pubsub.psubscribe(room_pattern())
    try:
        while not stop.is_set():
            incoming = pubsub.get_message(timeout=RECEIVE_TIMEOUT)
            if incoming is None or incoming.get("type") != "pmessage":
                continue
            project_id = project_id_from_channel(_as_text(incoming.get("channel")) or "")
            if project_id is None:
                continue
            with lock:
                if project_id not in wanted:
                    continue
            payload = _as_text(incoming.get("data"))
            if payload is not None:
                outgoing.put(payload)
    finally:
        pubsub.close()
        client.close()


def _as_text(value: object) -> str | None:
    if isinstance(value, bytes):
        return value.decode()
    return value if isinstance(value, str) else None

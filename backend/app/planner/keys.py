from __future__ import annotations

from typing import Protocol

from flask import current_app
from redis import Redis

REDIS_KEY = "kanbain:openai_api_key"

_memory: dict[str, str] = {}


class OpenAIKeyStore(Protocol):
    def get(self, name: str) -> bytes | str | None: ...
    def set(self, name: str, value: str) -> None: ...
    def delete(self, name: str) -> None: ...


class _MemoryStore:
    def get(self, name: str) -> str | None:
        return _memory.get(name)

    def set(self, name: str, value: str) -> None:
        _memory[name] = value

    def delete(self, name: str) -> None:
        _memory.pop(name, None)


def reset_key_store() -> None:
    _memory.clear()


def get_openai_api_key() -> str | None:
    stored = _decode(_store().get(REDIS_KEY))
    if stored:
        return stored
    env = current_app.config.get("OPENAI_API_KEY") or ""
    return env.strip() or None


def openai_api_key_configured() -> bool:
    return bool(get_openai_api_key())


def openai_api_key_hint() -> str | None:
    key = get_openai_api_key()
    if not key:
        return None
    return key[-4:] if len(key) >= 4 else key


def set_openai_api_key(value: str | None) -> None:
    store = _store()
    if value:
        store.set(REDIS_KEY, value)
        return
    store.delete(REDIS_KEY)


def _store() -> OpenAIKeyStore:
    if current_app.config.get("TESTING"):
        return _MemoryStore()
    return Redis.from_url(current_app.config["REDIS_URL"])


def _decode(value: bytes | str | None) -> str | None:
    if value is None:
        return None
    text = value.decode() if isinstance(value, bytes) else value
    stripped = text.strip()
    return stripped or None

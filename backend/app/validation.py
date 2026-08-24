from uuid import UUID

from .http import error_response

PRIORITIES = {"low", "medium", "high"}


def parse_optional_id(value: object, field: str = "id") -> str | None:
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")
    if len(value) > 36:
        raise ValueError(f"{field} is too long")
    try:
        UUID(value)
    except ValueError as exc:
        raise ValueError(f"{field} must be a UUID") from exc
    return value


def require_title(payload: dict) -> str:
    title = payload.get("title")
    if not isinstance(title, str) or not title.strip():
        raise ValueError("title is required")
    return title.strip()


def parse_priority(value: object) -> str | None:
    if value is None or value == "":
        return None
    if value not in PRIORITIES:
        raise ValueError("priority must be low, medium, or high")
    return str(value)


def json_error(exc: ValueError):
    return error_response(str(exc), 400)

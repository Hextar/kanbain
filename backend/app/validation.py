from uuid import UUID

from .http import error_response

PRIORITIES = {"low", "medium", "high"}
DEADLINE_KINDS = {"hard", "nice_to_have", "ongoing"}
METHODOLOGIES = {"kanban", "scrum"}
QUALITY_BARS = {"mvp", "production_grade"}
RISK_LEVELS = {"low", "medium", "high"}
SENIORITIES = {"junior", "mid", "senior", "staff", "principal"}
WORK_KINDS = {"epic", "story", "task"}
TSHIRTS = {"xs", "s", "m", "l", "xl"}
COLUMN_COLOR_SEQUENCE = (
    "sky",
    "amber",
    "orange",
    "fuchsia",
    "violet",
    "teal",
    "emerald",
    "rose",
    "cyan",
    "indigo",
)
COLUMN_COLORS = set(COLUMN_COLOR_SEQUENCE)


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


def require_id(value: object, field: str) -> str:
    parsed = parse_optional_id(value, field)
    if parsed is None:
        raise ValueError(f"{field} is required")
    return parsed


def require_title(payload: dict) -> str:
    return require_text(payload, "title")


def require_text(payload: dict, field: str) -> str:
    value = payload.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} is required")
    return value.strip()


def parse_optional_text(value: object, field: str) -> str | None:
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")
    stripped = value.strip()
    return stripped or None


def parse_enum(value: object, allowed: set[str], field: str, *, required: bool = False) -> str | None:
    if value is None or value == "":
        if required:
            raise ValueError(f"{field} is required")
        return None
    if value not in allowed:
        raise ValueError(f"{field} must be one of: {', '.join(sorted(allowed))}")
    return str(value)


def parse_priority(value: object) -> str | None:
    return parse_enum(value, PRIORITIES, "priority")


def parse_string_list(value: object, field: str) -> list[str] | None:
    if value is None:
        return None
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise ValueError(f"{field} must be an array of strings")
    return value


def parse_number(value: object, field: str) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a number")
    if value < 0:
        raise ValueError(f"{field} must be >= 0")
    return float(value)


def parse_column_color(value: object) -> str | None:
    return parse_enum(value, COLUMN_COLORS, "color")


def default_column_color(order: int) -> str:
    return COLUMN_COLOR_SEQUENCE[order % len(COLUMN_COLOR_SEQUENCE)]


def parse_int(value: object, field: str) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{field} must be an integer")
    if value < 0:
        raise ValueError(f"{field} must be >= 0")
    return value


def json_error(exc: ValueError):
    return error_response(str(exc), 400)

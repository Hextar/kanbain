from __future__ import annotations

CHANNEL_PREFIX = "kanbain:room:"
CLIENT_HEADER = "X-Realtime-Client"


def project_channel(project_id: str) -> str:
    return f"{CHANNEL_PREFIX}project:{project_id}"


def project_id_from_channel(channel: str) -> str | None:
    prefix = f"{CHANNEL_PREFIX}project:"
    if not channel.startswith(prefix):
        return None
    return channel[len(prefix) :] or None


def room_pattern() -> str:
    return f"{CHANNEL_PREFIX}*"

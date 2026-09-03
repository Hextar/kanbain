from __future__ import annotations

import json
import re
from typing import Any

from flask import current_app
from openai import OpenAI

from .keys import get_openai_api_key
from .openai_planner import MISSING_KEY_MESSAGE


def routing_model() -> str:
    return current_app.config.get("OPENAI_ROUTING_MODEL") or "gpt-4o-mini"


def generation_seed() -> int:
    return int(current_app.config.get("OPENAI_SEED") or 7)


def complete_json(
    system: str,
    user: str,
    *,
    schema: dict[str, Any] | None = None,
    schema_name: str = "response",
) -> dict[str, Any]:
    api_key = get_openai_api_key()
    if not api_key:
        raise RuntimeError(MISSING_KEY_MESSAGE)
    client = OpenAI(api_key=api_key)
    kwargs: dict[str, Any] = {
        "model": routing_model(),
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"{user}\n\nRespond with JSON only."},
        ],
        "temperature": 0,
        "seed": generation_seed(),
    }
    if schema is not None:
        kwargs["response_format"] = {
            "type": "json_schema",
            "json_schema": {"name": schema_name, "strict": True, "schema": schema},
        }
    else:
        kwargs["response_format"] = {"type": "json_object"}
    response = client.chat.completions.create(**kwargs)
    content = response.choices[0].message.content
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("OpenAI returned empty JSON")
    return _parse_json_object(content)


def _parse_json_object(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    data = json.loads(text)
    if not isinstance(data, dict):
        raise RuntimeError("OpenAI JSON must be an object")
    return data

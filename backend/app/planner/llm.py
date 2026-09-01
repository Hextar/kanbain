from __future__ import annotations

import json
import re
from typing import Any

from flask import current_app
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from .keys import get_openai_api_key
from .openai_planner import MISSING_KEY_MESSAGE


def complete_json(system: str, user: str) -> dict[str, Any]:
    api_key = get_openai_api_key()
    if not api_key:
        raise RuntimeError(MISSING_KEY_MESSAGE)
    model = current_app.config.get("OPENAI_MODEL") or "gpt-4o"
    llm = ChatOpenAI(model=model, api_key=api_key, temperature=0)
    response = llm.invoke(
        [
            SystemMessage(content=system),
            HumanMessage(content=f"{user}\n\nRespond with JSON only."),
        ]
    )
    content = response.content
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

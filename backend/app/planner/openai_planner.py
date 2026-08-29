from __future__ import annotations

from flask import current_app
from openai import OpenAI

from ..models import Project
from .keys import get_openai_api_key
from .llm_schema import OPENAI_RESPONSE_FORMAT, plan_from_llm_json
from .prompt import compose_messages, format_prompt_for_log
from .schema import PlannerResult

MISSING_KEY_MESSAGE = "OpenAI API key is not configured. Add it in Settings."


class OpenAIPlanner:
    def __init__(self, client: OpenAI | None = None) -> None:
        self._client = client

    def generate(self, project: Project) -> PlannerResult:
        api_key = get_openai_api_key()
        if not api_key:
            raise RuntimeError(MISSING_KEY_MESSAGE)

        messages = compose_messages(project)
        prompt = format_prompt_for_log(messages)
        client = self._client or OpenAI(api_key=api_key)

        try:
            response = client.chat.completions.create(
                model=current_app.config.get("OPENAI_MODEL") or "gpt-4o",
                messages=messages,
                response_format=OPENAI_RESPONSE_FORMAT,
            )
        except Exception as exc:
            raise RuntimeError(f"OpenAI request failed: {exc}") from exc

        raw = (response.choices[0].message.content or "").strip()
        if not raw:
            raise RuntimeError("OpenAI returned an empty plan")
        return PlannerResult(prompt=prompt, raw=raw, plan=plan_from_llm_json(raw))

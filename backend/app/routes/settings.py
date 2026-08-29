from flask import Blueprint, jsonify, request

from ..http import error_response
from ..planner.keys import openai_api_key_hint, set_openai_api_key
from ..validation import json_error

settings_bp = Blueprint("settings", __name__)


@settings_bp.get("/api/settings")
def get_settings():
    return jsonify(_settings_payload())


@settings_bp.put("/api/settings")
def update_settings():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)
    if "openaiApiKey" not in payload:
        return error_response("openaiApiKey is required", 400)

    try:
        set_openai_api_key(_parse_api_key(payload.get("openaiApiKey")))
    except ValueError as exc:
        return json_error(exc)

    return jsonify(_settings_payload())


def _settings_payload() -> dict:
    hint = openai_api_key_hint()
    payload = {"openaiApiKeyConfigured": hint is not None}
    if hint:
        payload["openaiApiKeyHint"] = hint
    return payload


def _parse_api_key(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("openaiApiKey must be a string")
    stripped = value.strip()
    return stripped or None

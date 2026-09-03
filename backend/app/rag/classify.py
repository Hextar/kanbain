from __future__ import annotations

from typing import Any

from flask import current_app

from ..planner.llm import complete_json
from .domains import heuristic_classify, normalize_slug

CLASSIFY_SYSTEM = """\
You classify a project brief for retrieval.
Return JSON with a domain slug, aliases, confidence 0-1, and 3-5 search queries
covering work breakdown/estimation, risks/compliance, domain delivery practices,
and similar-project shape. Prefer known slugs: software-product, healthcare,
construction. Map IT/SaaS/web to software-product.
"""

CLASSIFY_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["domain_slug", "aliases", "confidence", "queries"],
    "properties": {
        "domain_slug": {"type": "string"},
        "aliases": {"type": "array", "items": {"type": "string"}},
        "confidence": {"type": "number"},
        "queries": {
            "type": "array",
            "minItems": 3,
            "maxItems": 5,
            "items": {"type": "string"},
        },
    },
}

SOURCE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["urls"],
    "properties": {
        "urls": {
            "type": "array",
            "maxItems": 8,
            "items": {"type": "string"},
        }
    },
}


def classify_brief(brief: str) -> dict[str, Any]:
    fallback = heuristic_classify(brief)
    if current_app.config.get("TESTING"):
        return fallback
    try:
        data = complete_json(CLASSIFY_SYSTEM, brief, schema=CLASSIFY_SCHEMA, schema_name="classify")
    except Exception:
        return fallback
    queries = [item.strip() for item in data.get("queries") or [] if isinstance(item, str) and item.strip()]
    aliases = [item.strip() for item in data.get("aliases") or [] if isinstance(item, str) and item.strip()]
    slug = normalize_slug(str(data.get("domain_slug") or fallback["domain_slug"]))
    confidence = data.get("confidence")
    return {
        "domain_slug": slug,
        "aliases": aliases or [slug],
        "confidence": float(confidence) if isinstance(confidence, (int, float)) else 0.5,
        "queries": queries[:5] or list(fallback["queries"]),
    }


def propose_source_urls(brief: str, domain_slug: str) -> list[str]:
    if current_app.config.get("TESTING"):
        return []
    try:
        data = complete_json(
            "Propose up to 8 publicly documented, legally safe URLs that would help plan a "
            f"{domain_slug} project. Prefer standards, official docs, and evergreen guides. "
            "No social networks, pastebins, or login walls.",
            brief,
            schema=SOURCE_SCHEMA,
            schema_name="sources",
        )
    except Exception:
        return []
    urls = data.get("urls")
    if not isinstance(urls, list):
        return []
    return [item.strip() for item in urls if isinstance(item, str) and item.strip()]

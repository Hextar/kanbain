from __future__ import annotations

import re

PLAYBOOK_DOMAIN = "pm-playbook"
SOFTWARE_DOMAIN = "software-product"

KNOWN_DOMAINS = (
    PLAYBOOK_DOMAIN,
    SOFTWARE_DOMAIN,
    "healthcare",
    "construction",
)

_ALIASES: dict[str, str] = {
    "pm-playbook": PLAYBOOK_DOMAIN,
    "project-management": PLAYBOOK_DOMAIN,
    "software-product": SOFTWARE_DOMAIN,
    "software": SOFTWARE_DOMAIN,
    "saas": SOFTWARE_DOMAIN,
    "it": SOFTWARE_DOMAIN,
    "information-technology": SOFTWARE_DOMAIN,
    "web": SOFTWARE_DOMAIN,
    "app": SOFTWARE_DOMAIN,
    "healthcare": "healthcare",
    "health": "healthcare",
    "medical": "healthcare",
    "construction": "construction",
    "building": "construction",
}

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def normalize_slug(value: str) -> str:
    slug = _SLUG_RE.sub("-", (value or "").strip().lower()).strip("-")
    return _ALIASES.get(slug, slug or SOFTWARE_DOMAIN)


def retrieve_slugs(domain_slug: str) -> list[str]:
    slug = normalize_slug(domain_slug)
    if slug == PLAYBOOK_DOMAIN:
        return [PLAYBOOK_DOMAIN]
    return [PLAYBOOK_DOMAIN, slug]


def heuristic_classify(text: str) -> dict[str, object]:
    blob = (text or "").lower()
    domain = SOFTWARE_DOMAIN
    if any(token in blob for token in ("hospital", "patient", "hipaa", "clinic", "health")):
        domain = "healthcare"
    elif any(token in blob for token in ("construction", "building", "site safety", "contractor")):
        domain = "construction"
    queries = [
        "work breakdown estimation milestones",
        "risks compliance constraints",
        "domain delivery practices",
        "similar project shape backlog",
    ]
    return {
        "domain_slug": domain,
        "aliases": [domain],
        "confidence": 0.4,
        "queries": queries,
    }

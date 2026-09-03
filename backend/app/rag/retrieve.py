from __future__ import annotations

import math
import re
from collections import defaultdict

from flask import current_app

from ..extensions import db
from ..models import WikiChunk, WikiSource
from .chunk import estimate_tokens
from .domains import PLAYBOOK_DOMAIN, retrieve_slugs
from .embed import cosine, embed_texts
from .models import RetrievedChunk, RetrievalResult
from .seed import embed_missing_chunks, ensure_wiki_seeded

_TOKEN_RE = re.compile(r"[a-z0-9]+")
VECTOR_CANDIDATES = 20
FTS_CANDIDATES = 20
FUSED_CAP = 20
RRF_K = 60
MMR_LAMBDA = 0.7


def retrieve(
    *,
    domain_slug: str,
    queries: list[str],
    extra_chunks: list[RetrievedChunk] | None = None,
) -> RetrievalResult:
    ensure_wiki_seeded(embed=not current_app.config.get("TESTING"))
    embed_missing_chunks()
    slugs = retrieve_slugs(domain_slug)
    rows = (
        db.session.execute(db.select(WikiChunk).where(WikiChunk.domain_slug.in_(slugs)))
        .scalars()
        .all()
    )
    sources: dict[str, WikiSource] = {}
    if rows:
        sources = {
            source.id: source
            for source in db.session.execute(
                db.select(WikiSource).where(WikiSource.id.in_({row.source_id for row in rows}))
            ).scalars()
        }
    query_list = [item.strip() for item in queries if item.strip()][:5] or [domain_slug]
    query_vectors = embed_texts(query_list) if not current_app.config.get("TESTING") else [[] for _ in query_list]

    fused: dict[str, float] = defaultdict(float)
    by_id: dict[str, WikiChunk] = {row.id: row for row in rows}
    facet_hits = [False] * len(query_list)

    for query_index, query in enumerate(query_list):
        vector_ranked = _vector_rank(rows, query_vectors[query_index] if query_index < len(query_vectors) else [])
        fts_ranked = _fts_rank(rows, query)
        if vector_ranked or fts_ranked:
            facet_hits[query_index] = True
        _rrf(fused, vector_ranked)
        _rrf(fused, fts_ranked)

    ordered = sorted(fused.items(), key=lambda item: item[1], reverse=True)
    picked = _mmr(ordered, by_id, cap=FUSED_CAP)
    budget = int(current_app.config.get("RAG_RESEARCH_TOKEN_BUDGET") or 2500)
    used = 0
    chunks: list[RetrievedChunk] = []
    seen_parent: set[str] = set()
    for chunk_id, score in picked:
        row = by_id[chunk_id]
        parent_key = f"{row.source_id}:{row.heading}"
        body = row.parent_text if parent_key not in seen_parent else row.text
        seen_parent.add(parent_key)
        tokens = estimate_tokens(body)
        if chunks and used + tokens > budget:
            break
        source = sources.get(row.source_id)
        chunks.append(
            RetrievedChunk(
                chunk_id=row.id,
                source_title=(source.title if source else row.heading),
                heading=row.heading,
                text=body,
                score=score,
                origin=source.origin if source else "seed",
                domain_slug=row.domain_slug,
            )
        )
        used += tokens

    if extra_chunks:
        for item in extra_chunks:
            tokens = estimate_tokens(item.text)
            if used + tokens > budget:
                break
            chunks.append(item)
            used += tokens

    playbook_hits = any(item.domain_slug == PLAYBOOK_DOMAIN for item in chunks)
    domain_hits = any(item.domain_slug == domain_slug for item in chunks) or domain_slug == PLAYBOOK_DOMAIN
    missing_facets = facet_hits.count(False)
    coverage_ok = bool(chunks) and playbook_hits and domain_hits and missing_facets <= 1
    return RetrievalResult(
        domain_slug=domain_slug,
        queries=query_list,
        chunks=chunks,
        coverage_ok=coverage_ok,
        notes=format_citations(chunks),
    )


def format_citations(chunks: list[RetrievedChunk]) -> str:
    if not chunks:
        return ""
    parts: list[str] = []
    for item in chunks:
        parts.append(f"[{item.source_title} / {item.heading}]\n{item.text.strip()}")
    return "\n\n".join(parts)


def _vector_rank(rows: list[WikiChunk], query_vec: list[float]) -> list[str]:
    if not query_vec:
        return []
    scored = [
        (row.id, cosine(query_vec, row.embedding or []))
        for row in rows
        if row.embedding
    ]
    scored.sort(key=lambda item: item[1], reverse=True)
    return [chunk_id for chunk_id, score in scored[:VECTOR_CANDIDATES] if score > 0]


def _fts_rank(rows: list[WikiChunk], query: str) -> list[str]:
    tokens = set(_TOKEN_RE.findall(query.lower()))
    if not tokens:
        return []
    scored: list[tuple[str, float]] = []
    for row in rows:
        hay = row.tsv or f"{row.heading} {row.text}".lower()
        found = [token for token in tokens if token in hay]
        if not found:
            continue
        scored.append((row.id, len(found) / math.sqrt(1 + hay.count(" "))))
    scored.sort(key=lambda item: item[1], reverse=True)
    return [chunk_id for chunk_id, _ in scored[:FTS_CANDIDATES]]


def _rrf(target: dict[str, float], ranked: list[str]) -> None:
    for rank, chunk_id in enumerate(ranked):
        target[chunk_id] += 1.0 / (RRF_K + rank + 1)


def _mmr(
    ordered: list[tuple[str, float]],
    by_id: dict[str, WikiChunk],
    *,
    cap: int,
) -> list[tuple[str, float]]:
    selected: list[tuple[str, float]] = []
    remaining = list(ordered)
    while remaining and len(selected) < cap:
        if not selected:
            selected.append(remaining.pop(0))
            continue
        best_index = 0
        best_score = float("-inf")
        selected_vecs = [by_id[item[0]].embedding or [] for item in selected]
        for index, (chunk_id, relevance) in enumerate(remaining):
            vec = by_id[chunk_id].embedding or []
            overlap = max((cosine(vec, other) for other in selected_vecs), default=0.0)
            mmr = MMR_LAMBDA * relevance - (1 - MMR_LAMBDA) * overlap
            if mmr > best_score:
                best_score = mmr
                best_index = index
        selected.append(remaining.pop(best_index))
    return selected

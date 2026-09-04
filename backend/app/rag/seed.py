from __future__ import annotations

import hashlib
from pathlib import Path

from flask import current_app
from sqlalchemy import Text, cast, or_

from ..extensions import db
from ..models import WikiChunk, WikiSource
from .chunk import chunk_markdown, estimate_tokens
from .embed import embed_texts

CORPUS_ROOT = Path(__file__).resolve().parent / "corpus"


def ensure_wiki_seeded(*, embed: bool = False) -> int:
    if not CORPUS_ROOT.is_dir():
        return 0
    added = 0
    for domain_dir in sorted(path for path in CORPUS_ROOT.iterdir() if path.is_dir()):
        for path in sorted(domain_dir.glob("*.md")):
            added += _upsert_seed_file(domain_dir.name, path)
    if embed:
        embed_missing_chunks(limit=0)
    return added


def embed_missing_chunks(limit: int = 64) -> int:
    # Postgres json has no equality operator, so compare empty arrays via text.
    query = db.select(WikiChunk).where(
        or_(
            WikiChunk.embedding.is_(None),
            cast(WikiChunk.embedding, Text) == "[]",
        )
    )
    if limit > 0:
        query = query.limit(limit)
    pending = (
        db.session.execute(query)
        .scalars()
        .all()
    )
    if not pending:
        return 0
    if current_app.config.get("TESTING"):
        return 0
    vectors = embed_texts([chunk.text for chunk in pending])
    filled = 0
    for chunk, vector in zip(pending, vectors, strict=True):
        if vector:
            chunk.embedding = vector
            filled += 1
    if filled:
        db.session.commit()
    return filled


def _upsert_seed_file(domain_slug: str, path: Path) -> int:
    raw = path.read_text(encoding="utf-8")
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    locator = str(path.relative_to(CORPUS_ROOT))
    existing = db.session.scalar(
        db.select(WikiSource).where(
            WikiSource.origin == "seed", WikiSource.locator == locator
        )
    )
    if existing and existing.content_hash == digest:
        return 0
    if existing:
        db.session.delete(existing)
        db.session.flush()
    source = WikiSource(
        domain_slug=domain_slug,
        origin="seed",
        locator=locator,
        title=path.stem.replace("-", " ").title(),
        license="internal",
        content_hash=digest,
    )
    db.session.add(source)
    db.session.flush()
    for piece in chunk_markdown(raw, source_title=source.title):
        db.session.add(
            WikiChunk(
                source_id=source.id,
                domain_slug=domain_slug,
                heading=piece.heading,
                text=piece.text,
                parent_text=piece.parent_text,
                token_count=estimate_tokens(piece.parent_text),
                tsv=f"{piece.heading} {piece.text}".lower(),
            )
        )
    db.session.commit()
    return 1

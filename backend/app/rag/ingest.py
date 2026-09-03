from __future__ import annotations

import hashlib
from urllib.parse import urlparse

from flask import current_app

from ..extensions import db
from ..models import Project, WikiChunk, WikiSource
from .chunk import chunk_markdown, estimate_tokens
from .embed import embed_texts
from .models import RetrievedChunk
from .scrape import _allowed, _clean_url, _fetch, _looks_injected

USER_ORIGIN = "user"


def ingest_project_urls(project: Project) -> list[RetrievedChunk]:
    urls = _project_urls(project)
    if not urls or current_app.config.get("TESTING"):
        return []
    chunks: list[RetrievedChunk] = []
    for url in urls:
        if not _clean_url(url) or not _allowed(url):
            continue
        try:
            body = _fetch(url, timeout=5.0)
        except Exception:
            continue
        if not body or _looks_injected(body):
            continue
        digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
        locator = f"project:{project.id}:{url}"
        existing = db.session.scalar(
            db.select(WikiSource).where(WikiSource.origin == USER_ORIGIN, WikiSource.locator == locator)
        )
        if existing and existing.content_hash == digest:
            source = existing
        else:
            if existing:
                db.session.delete(existing)
                db.session.flush()
            source = WikiSource(
                domain_slug="user",
                origin=USER_ORIGIN,
                locator=locator,
                title=urlparse(url).path.rsplit("/", 1)[-1] or "User document",
                license="user",
                content_hash=digest,
            )
            db.session.add(source)
            db.session.flush()
            for piece in chunk_markdown(body, source_title=source.title):
                db.session.add(
                    WikiChunk(
                        source_id=source.id,
                        domain_slug="user",
                        heading=piece.heading,
                        text=piece.text,
                        parent_text=piece.parent_text,
                        token_count=estimate_tokens(piece.parent_text),
                        tsv=f"{piece.heading} {piece.text}".lower(),
                    )
                )
            db.session.commit()
        rows = (
            db.session.execute(db.select(WikiChunk).where(WikiChunk.source_id == source.id))
            .scalars()
            .all()
        )
        pending = [row for row in rows if not row.embedding]
        if pending:
            vectors = embed_texts([row.text for row in pending])
            for row, vector in zip(pending, vectors, strict=True):
                if vector:
                    row.embedding = vector
            db.session.commit()
        for row in rows:
            chunks.append(
                RetrievedChunk(
                    chunk_id=row.id,
                    source_title=source.title,
                    heading=row.heading,
                    text=row.parent_text,
                    score=1.0,
                    origin=USER_ORIGIN,
                    domain_slug="user",
                )
            )
    return chunks


def _project_urls(project: Project) -> list[str]:
    urls: list[str] = []
    if project.prd_url:
        urls.append(project.prd_url)
    urls.extend(project.design_urls or [])
    if project.repo_url:
        urls.append(project.repo_url)
    return urls

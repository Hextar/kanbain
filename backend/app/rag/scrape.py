from __future__ import annotations

import hashlib
import ipaddress
import re
import socket
import time
from html.parser import HTMLParser
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

from flask import current_app

from ..extensions import db
from ..models import WikiChunk, WikiSource
from ..serialize import utcnow
from .chunk import chunk_markdown, estimate_tokens
from .embed import embed_texts

USER_AGENT = "KanbAInPlanner/1.0"
MAX_PAGES = 8
MAX_BYTES = 400_000
BLOCKED_HOSTS = {
    "localhost",
    "pastebin.com",
    "twitter.com",
    "x.com",
    "facebook.com",
    "instagram.com",
    "tiktok.com",
    "reddit.com",
}
INJECTION_MARKERS = (
    "ignore previous instructions",
    "ignore all instructions",
    "system prompt",
    "you are now",
)


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._skip = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in {"script", "style", "noscript"}:
            self._skip += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript"} and self._skip:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if self._skip:
            return
        text = " ".join(data.split())
        if text:
            self.parts.append(text)


def scrape_urls(urls: list[str], *, domain_slug: str, deadline: float) -> list[WikiSource]:
    saved: list[WikiSource] = []
    for raw in urls[:MAX_PAGES]:
        if time.monotonic() >= deadline:
            break
        url = _clean_url(raw)
        if not url or not _allowed(url):
            continue
        remaining = max(0.5, deadline - time.monotonic())
        try:
            body = _fetch(url, timeout=min(5.0, remaining))
        except Exception:
            continue
        if not body or _looks_injected(body):
            continue
        digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
        existing = db.session.scalar(
            db.select(WikiSource).where(WikiSource.origin == "scrape", WikiSource.locator == url)
        )
        if existing and existing.content_hash == digest:
            saved.append(existing)
            continue
        if existing:
            db.session.delete(existing)
            db.session.flush()
        source = WikiSource(
            domain_slug=domain_slug,
            origin="scrape",
            locator=url,
            title=urlparse(url).path.rsplit("/", 1)[-1] or url,
            license="scraped",
            content_hash=digest,
        )
        db.session.add(source)
        db.session.flush()
        for piece in chunk_markdown(body, source_title=source.title):
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
        saved.append(source)
        db.session.commit()
    _embed_sources(saved)
    return saved


def promote_sources(sources: list[WikiSource], *, cited_ids: set[str]) -> int:
    promoted = 0
    cited_sources = {
        chunk.source_id
        for chunk in db.session.execute(
            db.select(WikiChunk).where(WikiChunk.id.in_(cited_ids or [""]))
        ).scalars()
    }
    for source in sources:
        if source.origin != "scrape":
            continue
        if source.id not in cited_sources:
            continue
        source.promoted_at = utcnow()
        promoted += 1
    if promoted:
        db.session.commit()
    return promoted


def _embed_sources(sources: list[WikiSource]) -> None:
    if current_app.config.get("TESTING") or not sources:
        return
    chunks = (
        db.session.execute(
            db.select(WikiChunk).where(WikiChunk.source_id.in_({item.id for item in sources}))
        )
        .scalars()
        .all()
    )
    pending = [chunk for chunk in chunks if not chunk.embedding]
    if not pending:
        return
    vectors = embed_texts([chunk.text for chunk in pending])
    for chunk, vector in zip(pending, vectors, strict=True):
        if vector:
            chunk.embedding = vector
    db.session.commit()


def _clean_url(value: str) -> str | None:
    text = (value or "").strip()
    if not text:
        return None
    parsed = urlparse(text)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return None
    return text


def _allowed(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower().rstrip(".")
    if host in BLOCKED_HOSTS or host.endswith(".local"):
        return False
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
        if str(ip) in {"169.254.169.254", "fd00:ec2::254"}:
            return False
    robots = RobotFileParser()
    robots.set_url(f"{parsed.scheme}://{host}/robots.txt")
    try:
        robots.read()
        if not robots.can_fetch(USER_AGENT, url):
            return False
    except Exception:
        pass
    return True


def _fetch(url: str, *, timeout: float) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        raw = response.read(MAX_BYTES + 1)
        content_type = response.headers.get("Content-Type", "")
    if len(raw) > MAX_BYTES:
        return ""
    text = raw.decode("utf-8", errors="ignore")
    if "html" in content_type.lower() or re.search(r"<html|<body|<p", text, re.I):
        parser = _TextExtractor()
        parser.feed(text)
        return "\n".join(parser.parts)
    return text


def _looks_injected(text: str) -> bool:
    lowered = text.lower()
    return any(marker in lowered for marker in INJECTION_MARKERS)

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class RetrievedChunk:
    chunk_id: str
    source_title: str
    heading: str
    text: str
    score: float
    origin: str
    domain_slug: str
    cited: bool = False


@dataclass
class RetrievalResult:
    domain_slug: str
    queries: list[str]
    chunks: list[RetrievedChunk] = field(default_factory=list)
    coverage_ok: bool = True
    notes: str = ""

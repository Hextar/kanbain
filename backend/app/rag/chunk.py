from __future__ import annotations

from dataclasses import dataclass

MAX_CHILD_CHARS = 3200


@dataclass(frozen=True)
class Chunk:
    heading: str
    text: str
    parent_text: str


def chunk_markdown(markdown: str, *, source_title: str = "") -> list[Chunk]:
    text = (markdown or "").replace("\r\n", "\n").strip()
    if not text:
        return []
    sections: list[tuple[str, list[str]]] = []
    heading = source_title or "Introduction"
    body: list[str] = []
    for line in text.split("\n"):
        if line.startswith("#"):
            if body and "".join(body).strip():
                sections.append((heading, body))
            heading = line.lstrip("#").strip() or heading
            body = []
        else:
            body.append(line)
    if body and "".join(body).strip():
        sections.append((heading, body))
    if not sections:
        sections = [(source_title or "Document", text.split("\n"))]

    chunks: list[Chunk] = []
    for heading, lines in sections:
        parent = "\n".join([f"# {heading}", *lines]).strip()
        buffer: list[str] = []
        for line in lines:
            buffer.append(line)
            if sum(len(item) + 1 for item in buffer) >= MAX_CHILD_CHARS:
                child = "\n".join(buffer).strip()
                if child:
                    chunks.append(Chunk(heading=heading, text=child, parent_text=parent))
                buffer = []
        rest = "\n".join(buffer).strip()
        if rest:
            chunks.append(Chunk(heading=heading, text=rest, parent_text=parent))
    return chunks


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)

from __future__ import annotations

from flask import current_app
from openai import OpenAI

from ..planner.keys import get_openai_api_key

EMBEDDING_DIM = 1536


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    api_key = get_openai_api_key()
    if not api_key:
        return [[] for _ in texts]
    model = current_app.config.get("OPENAI_EMBEDDING_MODEL") or "text-embedding-3-small"
    client = OpenAI(api_key=api_key)
    response = client.embeddings.create(model=model, input=texts)
    by_index = {item.index: item.embedding for item in response.data}
    return [by_index[index] for index in range(len(texts))]


def cosine(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = 0.0
    left_norm = 0.0
    right_norm = 0.0
    for a, b in zip(left, right, strict=True):
        dot += a * b
        left_norm += a * a
        right_norm += b * b
    if left_norm <= 0 or right_norm <= 0:
        return 0.0
    return dot / ((left_norm ** 0.5) * (right_norm ** 0.5))

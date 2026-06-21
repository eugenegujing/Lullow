"""Simple Redis-backed vector store for retrieval-augmented generation.

This module provides minimal indexing and search capabilities over embeddings
stored in `app_redis_client`. It is intentionally small and dependency-free so
it works in the in-memory fallback used by tests.

Stored shape for each document key `vector:{doc_id}`:
  {"embedding": [...], "metadata": {...}}

A lightweight index of document ids is kept under the `vectors` index set.
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

from ..integrations.embedding_client import embedding_client
from ..integrations.redis_app_client import app_redis_client


_DOC_KEY_PREFIX = "vector:"
_INDEX_KEY = "vectors"


def _doc_key(doc_id: str) -> str:
    return f"{_DOC_KEY_PREFIX}{doc_id}"


def index_document(doc_id: str, embedding: List[float], metadata: Optional[Dict[str, Any]] = None) -> None:
    """Index a document by id with its embedding and optional metadata."""
    payload = {"embedding": embedding, "metadata": metadata or {}}
    app_redis_client.set_json(_doc_key(doc_id), payload)
    app_redis_client.add_to_index(_INDEX_KEY, doc_id)


def get_document(doc_id: str) -> Optional[Dict[str, Any]]:
    return app_redis_client.get_json(_doc_key(doc_id))


def _cosine(a: List[float], b: List[float]) -> float:
    # defensive: require same length
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def search(query: str, top_k: int = 5, min_score: float = 0.0) -> List[Dict[str, Any]]:
    """Embed `query`, score all indexed documents by cosine similarity, and
    return the top-k results with score >= min_score.
    """
    q_emb = embedding_client.embed_text(query)
    candidates = []
    for doc_id in app_redis_client.index_members(_INDEX_KEY):
        doc = get_document(doc_id)
        if not doc:
            continue
        emb = doc.get("embedding")
        if not emb:
            continue
        score = _cosine(q_emb, emb)
        if score >= min_score:
            candidates.append((score, doc_id, doc.get("metadata", {})))

    candidates.sort(key=lambda t: t[0], reverse=True)
    results: List[Dict[str, Any]] = []
    for score, doc_id, meta in candidates[:top_k]:
        results.append({"id": doc_id, "score": round(float(score), 4), "metadata": meta})
    return results


def seed_document_from_text(doc_id: str, text: str, metadata: Optional[Dict[str, Any]] = None) -> None:
    """Convenience: compute an embedding from `text` and index it."""
    emb = embedding_client.embed_text(text)
    index_document(doc_id, emb, metadata=metadata)

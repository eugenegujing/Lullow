"""Unit tests for the simple Redis-backed vector store."""
from __future__ import annotations

from app.integrations import vector_store
from app.integrations.redis_app_client import app_redis_client


def test_vector_search_simple():
    # Clear any existing index, seed two semantically distinct documents and
    # ensure the query prefers the semantically similar one.
    app_redis_client.delete("vectors")
    vector_store.seed_document_from_text("doc_stars", "A cozy bedtime story about stars and the moon.")
    vector_store.seed_document_from_text("doc_monster", "A scary monster story with loud noises and thunder.")

    # Ensure documents were indexed
    assert vector_store.get_document("doc_stars") is not None
    ids = app_redis_client.index_members("vectors")
    assert "doc_stars" in ids and "doc_monster" in ids

    results = vector_store.search("bedtime stars moon", top_k=2, min_score=-1.0)
    assert len(results) >= 1
    assert results[0]["id"] == "doc_stars"

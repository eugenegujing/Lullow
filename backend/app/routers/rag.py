"""RAG and story retrieval router."""
from __future__ import annotations

from fastapi import APIRouter, Body, Depends, HTTPException

from ..dependencies import require_auth
from ..models.schemas import (
    StorySearchRequest,
    StorySearchResponse,
    StoryFeedbackRequest,
)
from ..services import memory as memory_service
from ..services import story_retrieval as retrieval_service
from ..integrations import vector_store
from ..integrations.redis_app_client import app_redis_client

router = APIRouter(prefix="/api/rag", tags=["rag"], dependencies=[Depends(require_auth)])


@router.post("/story/search", response_model=StorySearchResponse)
def rag_story_search(req: StorySearchRequest) -> StorySearchResponse:
    """Search for an approved/liked story matching a comfort strategy."""
    settings = memory_service.get_settings(req.child_id)
    return retrieval_service.search_story(req, settings)


@router.post("/seed")
def rag_seed(docs: list[dict] = Body(...)) -> dict:
    """Seed vector documents. Each item should be {"id": str, "text": str, "metadata": {...}}."""
    if not isinstance(docs, list):
        raise HTTPException(status_code=400, detail="Expected a list of documents")
    added = 0
    for item in docs:
        doc_id = item.get("id") or item.get("doc_id")
        text = item.get("text")
        meta = item.get("metadata") or {}
        if not doc_id or not text:
            continue
        vector_store.seed_document_from_text(doc_id, text, metadata=meta)
        added += 1
    return {"seeded": added}


@router.get("/examples")
def rag_examples() -> list[dict]:
    """List indexed vector examples (id + metadata)."""
    ids = app_redis_client.index_members("vectors")
    out: list[dict] = []
    for doc_id in ids:
        doc = vector_store.get_document(doc_id)
        if not doc:
            continue
        out.append({"id": doc_id, "metadata": doc.get("metadata", {})})
    return out


@router.post("/story/{story_id}/index")
def rag_index_story(story_id: str) -> dict:
    """Index an existing stored story for RAG reuse (approved/liked required elsewhere)."""
    story = memory_service.get_story(story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")
    profile = memory_service.get_profile(story.child_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    world = memory_service.get_world(story.child_id)
    record = retrieval_service.index_story_from_existing(story, profile, world, approved=True)
    return {"indexed": record.story_id}


@router.post("/story/{story_id}/reject")
def rag_reject_story(story_id: str, req: StoryFeedbackRequest) -> dict:
    """Mark a story as rejected (updates retrieval metadata)."""
    record = retrieval_service.get_rag_record(story_id)
    if record is None:
        raise HTTPException(status_code=404, detail="RAG record not found")
    updated = retrieval_service.apply_feedback(req, record)
    return {"story_id": updated.story_id, "rejected": updated.rejected}

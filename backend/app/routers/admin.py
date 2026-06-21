"""Admin routes for debugging and lightweight runtime controls.

This file intentionally exposes non-sensitive read-only debug info for
development/hackathon use. Do not enable these endpoints in production
without proper access controls.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from ..config import settings
from ..dependencies import require_auth

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_auth)])


@router.get("/rag/tuning")
def rag_tuning() -> dict:
    """Return current RAG tuning configuration values."""
    return {
        "rag_vector_weight": settings.rag_vector_weight,
        "rag_metadata_weight": settings.rag_metadata_weight,
        "rag_min_vector_score": settings.rag_min_vector_score,
        "rag_default_min_score": settings.rag_default_min_score,
    }

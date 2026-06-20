"""Growth journal & evaluation router for Lullow.

GET /api/journal/{child_id}    → GrowthJournal
GET /api/journal/evals/recent  → list of recent Arize-style evaluation records
"""
from __future__ import annotations

import logging

from fastapi import APIRouter

from ..integrations.arize_client import arize_client
from ..models.schemas import GrowthJournal
from ..services.journal import build_journal

logger = logging.getLogger("lullow.routers.journal")

router = APIRouter(prefix="/api/journal", tags=["journal"])


@router.get("/evals/recent")
def evals_recent() -> list:
    """Return recent Arize-style evaluation records for the eval dashboard.

    Always reads from the local JSONL trace, so it works without an Arize
    account. Returns newest evaluations last (JSONL append order).
    """
    return arize_client.recent_evaluations(limit=100)


@router.get("/{child_id}", response_model=GrowthJournal)
def get_journal(child_id: str) -> GrowthJournal:
    """Build and return the growth journal for a child.

    Aggregates emotion counts, themes, and helpful elements from stored
    stories, then generates a warm non-diagnostic parent reflection.
    """
    return build_journal(child_id)

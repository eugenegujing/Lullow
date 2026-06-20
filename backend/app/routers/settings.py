"""Parent safety settings router for Lullow.

GET /api/settings/{child_id}  → ParentSafetySettings (defaults if none)
PUT /api/settings              ParentSafetySettings body → ParentSafetySettings
"""
from __future__ import annotations

import logging

from fastapi import APIRouter

from ..models.schemas import ParentSafetySettings
from ..services import memory as memory_service

logger = logging.getLogger("lullow.routers.settings")

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/{child_id}", response_model=ParentSafetySettings)
def get_settings(child_id: str) -> ParentSafetySettings:
    """Return parent safety settings, defaulted if none configured yet."""
    return memory_service.get_settings(child_id)


@router.put("", response_model=ParentSafetySettings)
def update_settings(settings_obj: ParentSafetySettings) -> ParentSafetySettings:
    """Create or update parent safety settings."""
    return memory_service.save_settings(settings_obj)

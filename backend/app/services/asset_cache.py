"""Stable cache keys and Redis helpers for story slide assets."""
from __future__ import annotations

import hashlib
import re
from typing import Any, Optional

from ..integrations.redis_app_client import app_redis_client

_SAFE_PART = re.compile(r"[^a-z0-9]+")


def stable_part(value: str | None, fallback: str = "none") -> str:
    """Normalize a cache-key component into a short stable slug."""
    text = (value or fallback).strip().lower()
    text = _SAFE_PART.sub("-", text).strip("-")
    return text or fallback


def text_hash(text: str, length: int = 12) -> str:
    """Return a compact deterministic hash for narration text."""
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()[:length]


def story_title_key(title: str) -> str:
    return f"story:title:{stable_part(title)}"


def image_cache_key(
    *,
    story_title: str,
    character: str | None,
    setting: str | None,
    emotion: str | None,
    scene_index: int,
) -> str:
    """Cache key with 5 matching attributes for picture reuse."""
    return (
        f"image:{stable_part(story_title)}:"
        f"{stable_part(character, 'character')}:"
        f"{stable_part(setting, 'setting')}:"
        f"{stable_part(emotion, 'emotion')}:"
        f"{scene_index}"
    )


def get_cached_asset(key: str) -> Optional[dict[str, Any]]:
    return app_redis_client.get_json(key)


def save_cached_asset(key: str, value: dict[str, Any]) -> dict[str, Any]:
    app_redis_client.set_json(key, value)
    return value

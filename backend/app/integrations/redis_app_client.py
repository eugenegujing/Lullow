"""Redis client for generated app state: stories, worlds, RAG, assets."""
from __future__ import annotations

from ..config import settings
from .redis_client import RedisClient


app_redis_client = RedisClient(
    db=settings.redis_app_db,
    name="app",
    url=settings.redis_app_url or settings.redis_url,
)

"""Redis client for auth, sessions, profiles, and parent safety settings."""
from __future__ import annotations

from ..config import settings
from .redis_client import RedisClient


profile_redis_client = RedisClient(
    db=settings.redis_profile_db,
    name="profile",
    url=settings.redis_profile_url or settings.redis_url,
)

"""Redis client — Lullow's family / story-world memory.

Stores child profiles, parent safety settings, story-world continuity, stories,
and journal entries. Long-term memory is what makes Lullow more than a one-off
story generator. With no REDIS_URL (or if the server is unreachable) an
in-process dict store is used so the app still runs.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

from ..config import settings

logger = logging.getLogger("lullow.redis")


class _MemoryStore:
    """Minimal in-process stand-in for the Redis commands Lullow uses."""

    def __init__(self) -> None:
        self._kv: dict[str, str] = {}
        self._sets: dict[str, set[str]] = {}

    def get(self, key: str) -> Optional[str]:
        return self._kv.get(key)

    def set(self, key: str, value: str) -> None:
        self._kv[key] = value

    def delete(self, key: str) -> None:
        self._kv.pop(key, None)

    def sadd(self, key: str, member: str) -> None:
        self._sets.setdefault(key, set()).add(member)

    def smembers(self, key: str) -> set[str]:
        return set(self._sets.get(key, set()))


class RedisClient:
    def __init__(self) -> None:
        self.live = False
        self._store: Any = _MemoryStore()
        if settings.redis_url:
            try:
                import redis  # lazy import

                client = redis.from_url(settings.redis_url, decode_responses=True)
                client.ping()
                self._store = client
                self.live = True
            except Exception as exc:  # pragma: no cover - depends on env
                logger.warning("Redis unavailable, using in-memory store: %s", exc)
                self._store = _MemoryStore()

    # --- JSON helpers ---
    def get_json(self, key: str) -> Optional[Any]:
        raw = self._store.get(key)
        return json.loads(raw) if raw else None

    def set_json(self, key: str, value: Any) -> None:
        self._store.set(key, json.dumps(value, default=str))

    def delete(self, key: str) -> None:
        self._store.delete(key)

    # --- index of ids (e.g. stories for a child) ---
    def add_to_index(self, index_key: str, member: str) -> None:
        self._store.sadd(index_key, member)

    def index_members(self, index_key: str) -> list[str]:
        return sorted(self._store.smembers(index_key))


redis_client = RedisClient()

"""Redis client — Lullow's family / story-world memory.

Stores child profiles, parent safety settings, story-world continuity, stories,
and journal entries. Long-term memory is what makes Lullow more than a one-off
story generator. With no REDIS_URL (or if the server is unreachable) an
in-process dict store is used so the app still runs.
"""
from __future__ import annotations

import base64
import json
import logging
import time
import zlib
from typing import Any, Optional

from ..config import settings

logger = logging.getLogger("lullow.redis")

_COMPRESSED_PREFIX = "zlib:"


class _MemoryStore:
    """Minimal in-process stand-in for the Redis commands Lullow uses."""

    def __init__(self) -> None:
        self._kv: dict[str, str] = {}
        self._sets: dict[str, set[str]] = {}
        self._expirations: dict[str, float] = {}

    def _expired(self, key: str) -> bool:
        expires_at = self._expirations.get(key)
        if expires_at is None or expires_at > time.time():
            return False
        self.delete(key)
        return True

    def get(self, key: str) -> Optional[str]:
        if self._expired(key):
            return None
        return self._kv.get(key)

    def set(self, key: str, value: str) -> None:
        self._kv[key] = value
        self._expirations.pop(key, None)

    def setex(self, key: str, ttl_seconds: int, value: str) -> None:
        self._kv[key] = value
        self._expirations[key] = time.time() + ttl_seconds

    def delete(self, key: str) -> None:
        self._kv.pop(key, None)
        self._expirations.pop(key, None)

    def sadd(self, key: str, member: str) -> None:
        self._sets.setdefault(key, set()).add(member)

    def smembers(self, key: str) -> set[str]:
        return set(self._sets.get(key, set()))


class RedisClient:
    def __init__(
        self,
        db: int | None = None,
        name: str = "default",
        url: str | None = None,
    ) -> None:
        self.db = db
        self.name = name
        self.url = url if url is not None else settings.redis_url
        self.live = False
        self._store: Any = _MemoryStore()
        if self.url:
            try:
                import redis  # lazy import
                # Prefer a short timeout and response decoding for local use.
                kwargs = {
                    "decode_responses": True,
                    "socket_timeout": 5,
                    "socket_connect_timeout": 5,
                }
                if db is not None:
                    kwargs["db"] = db

                # Attempt a few pings with backoff; sometimes networked Redis
                # can be slow on first connect.
                client = redis.from_url(self.url, **kwargs)
                max_attempts = 3
                attempt = 0
                while attempt < max_attempts:
                    try:
                        client.ping()
                        self._store = client
                        self.live = True
                        break
                    except Exception:
                        attempt += 1
                        time.sleep(0.2 * (2 ** attempt))

                if not self.live and db is not None:
                    # Some managed Redis providers only support DB 0.
                    fallback_kwargs = kwargs.copy()
                    fallback_kwargs["db"] = 0
                    fallback_client = redis.from_url(self.url, **fallback_kwargs)
                    attempt = 0
                    while attempt < max_attempts:
                        try:
                            fallback_client.ping()
                            self._store = fallback_client
                            self.live = True
                            logger.warning(
                                "Redis %s database %s unavailable, falling back to db=0",
                                name,
                                db,
                            )
                            break
                        except Exception:
                            attempt += 1
                            time.sleep(0.2 * (2 ** attempt))

                if not self.live:
                    raise RuntimeError("redis ping failed after retries")

                # Log a masked connection string for debugging (hide password)
                try:
                    url = self.url
                    if "@" in url and ":" in url.split("@")[0]:
                        prefix, host = url.split("@", 1)
                        userinfo = prefix.split("//", 1)[-1]
                        if ":" in userinfo:
                            user, _ = userinfo.split(":", 1)
                            masked = f"{url.split('//')[0]}//{user}:****@{host}"
                        else:
                            masked = url
                    else:
                        masked = url
                    logger.info("Connected to Redis (%s)", masked)
                except Exception:
                    logger.info("Connected to Redis (url masked)")
            except Exception as exc:  # pragma: no cover - depends on env
                logger.warning(
                    "Redis %s unavailable, using in-memory store: %s",
                    name,
                    exc,
                )
                self._store = _MemoryStore()

    def test_connection(self) -> bool:
        """Return True if the live Redis connection responds to ping.

        Safe to call from health checks.
        """
        if not self.live:
            return False
        try:
            return bool(self._store.ping())
        except Exception:
            return False

    # --- JSON helpers ---
    def get_json(self, key: str) -> Optional[Any]:
        raw = self._store.get(key)
        if raw and raw.startswith(_COMPRESSED_PREFIX):
            compressed = base64.b64decode(raw[len(_COMPRESSED_PREFIX):].encode("ascii"))
            raw = zlib.decompress(compressed).decode("utf-8")
        return json.loads(raw) if raw else None

    def set_json(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        payload = json.dumps(value, default=str)
        if (
            settings.redis_compress_json
            and len(payload.encode("utf-8")) >= settings.redis_compress_min_bytes
        ):
            compressed = zlib.compress(payload.encode("utf-8"))
            payload = _COMPRESSED_PREFIX + base64.b64encode(compressed).decode("ascii")
        if ttl_seconds is not None:
            self._store.setex(key, ttl_seconds, payload)
        else:
            self._store.set(key, payload)

    def delete(self, key: str) -> None:
        self._store.delete(key)

    # --- index of ids (e.g. stories for a child) ---
    def add_to_index(self, index_key: str, member: str) -> None:
        self._store.sadd(index_key, member)

    def index_members(self, index_key: str) -> list[str]:
        return sorted(self._store.smembers(index_key))


# Backward-compatible app-state client. New code should prefer the explicit
# app_redis_client / profile_redis_client modules.
redis_client = RedisClient(db=settings.redis_app_db, name="app")

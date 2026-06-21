"""Tests for Redis client storage helpers."""
from __future__ import annotations

from app.integrations.redis_client import RedisClient, _MemoryStore


def test_set_json_small_payload_stays_plain(monkeypatch):
    from app.integrations import redis_client as rc_module

    monkeypatch.setattr(rc_module.settings, "redis_compress_json", True)
    monkeypatch.setattr(rc_module.settings, "redis_compress_min_bytes", 1024)
    client = RedisClient(name="test")
    store = _MemoryStore()
    client._store = store

    client.set_json("small", {"hello": "moon"})

    raw = store.get("small")
    assert raw is not None
    assert not raw.startswith("zlib:")
    assert client.get_json("small") == {"hello": "moon"}


def test_set_json_large_payload_compresses_and_round_trips(monkeypatch):
    from app.integrations import redis_client as rc_module

    monkeypatch.setattr(rc_module.settings, "redis_compress_json", True)
    monkeypatch.setattr(rc_module.settings, "redis_compress_min_bytes", 32)
    client = RedisClient(name="test")
    store = _MemoryStore()
    client._store = store
    payload = {"story": "soft moonlight " * 100}

    client.set_json("large", payload)

    raw = store.get("large")
    assert raw is not None
    assert raw.startswith("zlib:")
    assert client.get_json("large") == payload

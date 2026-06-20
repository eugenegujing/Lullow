"""Shared test fixtures for Lullow.

Key design decisions:
- Force mock mode: monkeypatch anthropic_client.live = False so every Claude
  call returns its deterministic mock. Tests never hit the network.
- Use the in-memory Redis store (it's the default when REDIS_URL is empty, but
  we also reset the store between tests for isolation).
- Provide a fresh TestClient pointing at the real app.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.integrations.anthropic_client import anthropic_client
from app.integrations.redis_client import RedisClient, _MemoryStore
from app.integrations.deepgram_client import deepgram_client
from app.integrations.image_client import image_client
from app.integrations.pika_client import pika_client


@pytest.fixture(autouse=True)
def force_mock_mode(monkeypatch):
    """Force all integrations into mock/offline mode for determinism."""
    monkeypatch.setattr(anthropic_client, "live", False)
    monkeypatch.setattr(anthropic_client, "_client", None)
    monkeypatch.setattr(deepgram_client, "live", False)
    monkeypatch.setattr(deepgram_client, "_client", None)
    monkeypatch.setattr(image_client, "live", False)
    monkeypatch.setattr(pika_client, "live", False)


@pytest.fixture(autouse=True)
def fresh_memory_store(monkeypatch):
    """Replace the redis_client's backing store with a fresh in-memory store.

    This isolates each test — nothing bleeds between test functions.
    """
    from app.integrations import redis_client as rc_module

    fresh = _MemoryStore()
    monkeypatch.setattr(rc_module.redis_client, "_store", fresh)
    monkeypatch.setattr(rc_module.redis_client, "live", False)


@pytest.fixture
def client():
    """Return a TestClient for the Lullow FastAPI app.

    The lifespan (seed_demo) is NOT called here; tests that need Leo seeded
    should call seed_demo() explicitly (or just use the memory fixtures).
    """
    from app.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture
def seeded_client(fresh_memory_store):
    """TestClient with demo data (Leo / Nino / Moonberry Forest) already seeded."""
    from app.main import app
    from app.services.memory import seed_demo

    seed_demo()
    with TestClient(app) as c:
        yield c

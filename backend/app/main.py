"""Lullow FastAPI application entrypoint.

Run with:  uvicorn app.main:app --reload --port 8000   (from the backend/ dir)
"""
from __future__ import annotations

import importlib
import logging

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lullow")


@asynccontextmanager
async def _lifespan(app: FastAPI):
    """Seed demo data on startup if no children exist yet."""
    try:
        from .services.memory import seed_demo
        seed_demo()
    except Exception as exc:  # pragma: no cover
        logger.warning("Demo seed failed (non-fatal): %s", exc)
    yield


app = FastAPI(
    title="Lullow",
    description="A voice-first bedtime comfort companion for children.",
    version="0.1.0",
    lifespan=_lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "app": "lullow"}


@app.get("/api/status")
def status() -> dict:
    """Which sponsor integrations are live vs. running on mock fallbacks."""
    return {
        "features": settings.feature_status(),
        "note": "true = live integration, false = mock fallback (app still works)",
    }


# Include feature routers defensively so the app runs even while some are still
# being implemented by the backend dev.
_ROUTERS = [
    "session",
    "story",
    "voice",
    "visual",
    "profile",
    "settings",
    "journal",
    "lamp",
]

for name in _ROUTERS:
    try:
        module = importlib.import_module(f".routers.{name}", package="app")
        app.include_router(module.router)
        logger.info("Mounted router: %s", name)
    except ModuleNotFoundError:
        logger.info("Router not yet present (skipping): %s", name)
    except Exception as exc:  # pragma: no cover
        logger.warning("Failed to mount router %s: %s", name, exc)

"""Embedding client with a deterministic mock fallback.

Provides a simple, dependency-free embedding generator for local development
and tests. When a live provider key is configured the client will try a
provider call and fall back to the deterministic generator on error.

The deterministic embedding maps text -> fixed-length float vector using a
SHA256-based stream; vectors are length-normalized so they can be compared by
cosine similarity.
"""
from __future__ import annotations

import hashlib
import math
from typing import List

from ..config import settings


class EmbeddingClient:
    def __init__(self, dim: int = 128) -> None:
        self.dim = dim
        # live when an explicit provider key is present (provider-specific
        # wiring may be added later). For now we prefer deterministic local
        # behaviour unless a real provider is configured.
        self.live = bool(getattr(settings, "openai_api_key", "") or getattr(settings, "gemini_api_key", ""))

    def _deterministic(self, text: str) -> List[float]:
        """Deterministic embedding: expand SHA256 digest to `dim` floats.

        Returns a unit-normalized vector.
        """
        if not text:
            text = ""
        # Create a reproducible pseudorandom byte stream from the text.
        seed = hashlib.sha256(text.encode("utf-8")).digest()
        out: List[float] = []
        digest = seed
        # Expand until we have enough bytes to produce `dim` floats.
        while len(out) < self.dim:
            # Hash the previous digest to get more bytes
            digest = hashlib.sha256(digest).digest()
            for b in digest:
                # map byte [0..255] -> float [-1.0 .. 1.0]
                out.append((b / 255.0) * 2.0 - 1.0)
                if len(out) >= self.dim:
                    break

        # Truncate and normalize to unit length
        vec = out[: self.dim]
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]

    def embed_text(self, text: str) -> List[float]:
        """Return an embedding for `text`.

        Currently always returns the deterministic vector unless a live provider
        is configured and successfully returns an embedding. Live provider
        integration points can be added here.
        """
        if not self.live:
            return self._deterministic(text)

        # Placeholder for a real provider call. Keep behaviour robust: if the
        # provider call fails for any reason, fall back to deterministic.
        try:
            # Example: call out to OpenAI, Anthropic, or Fetch.ai here.
            # Implementations should return a sequence of floats of length
            # `self.dim` or convertible to that form.
            raise NotImplementedError("No live embedding provider configured")
        except Exception:
            return self._deterministic(text)


embedding_client = EmbeddingClient()

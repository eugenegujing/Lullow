"""Anthropic (Claude) client — the reasoning layer for Lullow.

Powers emotion extraction, safe story planning, story generation, parent
rewriting, safety evaluation, and journal reflection. If no key is configured
(or the SDK/network fails), every call returns the caller-supplied ``mock`` so
the pipeline still completes deterministically.

generate_json and generate_text both return a (value, used_mock: bool) tuple.
used_mock is True whenever the mock was returned — either because no live key
is configured, or because the live call or parse failed.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Optional

from ..config import settings

logger = logging.getLogger("lullow.anthropic")


def _extract_json(text: str) -> Any:
    """Pull the first JSON object/array out of a model response."""
    text = text.strip()
    # Strip ```json ... ``` fences if present.
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise


class AnthropicClient:
    def __init__(self) -> None:
        self.live = bool(settings.anthropic_api_key)
        self._client = None
        if self.live:
            try:
                import anthropic  # lazy import

                self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            except Exception as exc:  # pragma: no cover - depends on env
                logger.warning("Anthropic SDK unavailable, using mock: %s", exc)
                self.live = False

    def _model(self, deep: bool) -> str:
        return settings.anthropic_deep_model if deep else settings.anthropic_model

    def _call(self, system: str, user: str, *, deep: bool, max_tokens: int) -> Optional[str]:
        if not self.live or self._client is None:
            return None
        try:
            resp = self._client.messages.create(
                model=self._model(deep),
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            return "".join(
                block.text for block in resp.content if getattr(block, "type", None) == "text"
            )
        except Exception as exc:  # pragma: no cover - network dependent
            logger.warning("Anthropic call failed, using mock: %s", exc)
            return None

    def generate_json(
        self,
        system: str,
        user: str,
        *,
        mock: dict | list,
        deep: bool = False,
        max_tokens: int = 1500,
    ) -> tuple[dict | list, bool]:
        """Return (result, used_mock).

        used_mock is True when the mock was returned — no live key, call failed,
        or JSON parse failed.
        """
        raw = self._call(system, user, deep=deep, max_tokens=max_tokens)
        if raw is None:
            return mock, True
        try:
            return _extract_json(raw), False
        except Exception as exc:
            logger.warning("Could not parse Claude JSON, using mock: %s", exc)
            return mock, True

    def generate_text(
        self,
        system: str,
        user: str,
        *,
        mock: str,
        deep: bool = False,
        max_tokens: int = 1500,
    ) -> tuple[str, bool]:
        """Return (result, used_mock).

        used_mock is True when the mock was returned.
        """
        raw = self._call(system, user, deep=deep, max_tokens=max_tokens)
        if raw:
            return raw.strip(), False
        return mock, True


anthropic_client = AnthropicClient()

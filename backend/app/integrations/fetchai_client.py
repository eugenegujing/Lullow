"""Fetch.ai / ASI One prompt provider adapter.

Fetch.ai's ASI One API uses an OpenAI-compatible chat completions contract:
POST /v1/chat/completions with a model and messages array. The adapter stays
behind the prompt_agent facade so the rest of the app can ask for JSON or text
without knowing provider details.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

import httpx

from ..config import settings
from .anthropic_client import _extract_json

logger = logging.getLogger("lullow.fetchai")


class FetchAIClient:
    def __init__(self) -> None:
        self.live = bool(settings.fetchai_resolved_api_key and settings.fetchai_base_url)

    def _payload(self, system: str, user: str, *, max_tokens: int) -> dict[str, Any]:
        return {
            "model": settings.fetchai_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": max_tokens,
        }

    def _call(self, system: str, user: str, *, deep: bool, max_tokens: int) -> Optional[str]:
        if not self.live:
            return None
        headers = {
            "Authorization": f"Bearer {settings.fetchai_resolved_api_key}",
            "Content-Type": "application/json",
        }
        payload = self._payload(system, user, max_tokens=max_tokens)
        try:
            resp = httpx.post(
                settings.fetchai_base_url,
                headers=headers,
                json=payload,
                timeout=30.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return self._extract_text(data)
        except Exception as exc:  # pragma: no cover - network/provider dependent
            logger.warning("Fetch.ai call failed, using mock: %s", exc)
            return None

    @staticmethod
    def _extract_text(data: Any) -> Optional[str]:
        """Support a few common LLM response shapes."""
        if isinstance(data, str):
            return data
        if not isinstance(data, dict):
            return None
        for key in ("content", "text", "response", "result", "output"):
            value = data.get(key)
            if isinstance(value, str):
                return value
            if isinstance(value, (dict, list)):
                return json.dumps(value)
        choices = data.get("choices")
        if isinstance(choices, list) and choices:
            first = choices[0]
            if isinstance(first, dict):
                message = first.get("message")
                if isinstance(message, dict) and isinstance(message.get("content"), str):
                    return message["content"]
                if isinstance(first.get("text"), str):
                    return first["text"]
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
        raw = self._call(system, user, deep=deep, max_tokens=max_tokens)
        if raw is None:
            return mock, True
        try:
            return _extract_json(raw), False
        except Exception as exc:
            logger.warning("Could not parse Fetch.ai JSON, using mock: %s", exc)
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
        raw = self._call(system, user, deep=deep, max_tokens=max_tokens)
        return (raw.strip(), False) if raw else (mock, True)


fetchai_client = FetchAIClient()

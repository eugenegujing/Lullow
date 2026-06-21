"""Prompt-generation facade — switchable between Anthropic (Claude) and Fetch.ai.

All prompt-producing services call this facade. The active LLM is chosen by
``settings.prompt_provider`` ("anthropic" or "fetchai"), so both sponsor tracks
stay available. Each underlying client returns deterministic mocks when its key
isn't configured, so local dev/tests work either way.
"""
from __future__ import annotations

from ..config import settings


class PromptAgent:
    @property
    def provider_name(self) -> str:
        return settings.prompt_provider

    def _client(self):
        """Return the configured LLM client (lazy import to avoid hard deps)."""
        if settings.prompt_provider == "anthropic":
            from ..integrations.anthropic_client import anthropic_client

            return anthropic_client
        from ..integrations.fetchai_client import fetchai_client

        return fetchai_client

    def generate_json(
        self,
        system: str,
        user: str,
        *,
        mock: dict | list,
        deep: bool = False,
        max_tokens: int = 1500,
    ) -> tuple[dict | list, bool]:
        return self._client().generate_json(
            system, user, mock=mock, deep=deep, max_tokens=max_tokens
        )

    def generate_text(
        self,
        system: str,
        user: str,
        *,
        mock: str,
        deep: bool = False,
        max_tokens: int = 1500,
    ) -> tuple[str, bool]:
        return self._client().generate_text(
            system, user, mock=mock, deep=deep, max_tokens=max_tokens
        )


prompt_agent = PromptAgent()

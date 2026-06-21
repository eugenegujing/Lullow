"""Fetch.ai prompt generation facade.

All prompt-producing services call this facade. Fetch.ai is the only live
prompt provider; deterministic mocks keep local development and tests working
when Fetch.ai is not configured.
"""
from __future__ import annotations

from ..integrations.fetchai_client import fetchai_client


class PromptAgent:
    @property
    def provider_name(self) -> str:
        return "fetchai"

    def generate_json(
        self,
        system: str,
        user: str,
        *,
        mock: dict | list,
        deep: bool = False,
        max_tokens: int = 1500,
    ) -> tuple[dict | list, bool]:
        return fetchai_client.generate_json(
            system,
            user,
            mock=mock,
            deep=deep,
            max_tokens=max_tokens,
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
        return fetchai_client.generate_text(
            system,
            user,
            mock=mock,
            deep=deep,
            max_tokens=max_tokens,
        )


prompt_agent = PromptAgent()

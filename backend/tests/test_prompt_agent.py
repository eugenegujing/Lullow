"""Tests for prompt provider abstraction."""
from __future__ import annotations

from app.integrations.fetchai_client import FetchAIClient
from app.services.prompt_agent import prompt_agent


def test_fetchai_extract_text_supports_common_shapes():
    assert FetchAIClient._extract_text({"content": "hello"}) == "hello"
    assert FetchAIClient._extract_text({"text": "hello"}) == "hello"
    assert FetchAIClient._extract_text({"response": {"ok": True}}) == '{"ok": true}'
    assert (
        FetchAIClient._extract_text(
            {"choices": [{"message": {"content": "from choice"}}]}
        )
        == "from choice"
    )


def test_fetchai_payload_uses_asi_one_chat_completions_shape():
    client = FetchAIClient()
    payload = client._payload("system prompt", "user prompt", max_tokens=321)

    assert payload["model"] == "asi1"
    assert payload["max_tokens"] == 321
    assert payload["messages"] == [
        {"role": "system", "content": "system prompt"},
        {"role": "user", "content": "user prompt"},
    ]


def test_fetchai_json_falls_back_to_mock_when_not_live():
    client = FetchAIClient()
    client.live = False

    result, used_mock = client.generate_json(
        "system",
        "user",
        mock={"ok": True},
    )

    assert result == {"ok": True}
    assert used_mock is True


def test_prompt_agent_is_fetchai_only():
    assert prompt_agent.provider_name == "fetchai"


def test_prompt_agent_fetchai_falls_back_when_unconfigured(monkeypatch):
    from app.services import prompt_agent as prompt_module

    monkeypatch.setattr(prompt_module.fetchai_client, "live", False)

    result, used_mock = prompt_agent.generate_json(
        "system",
        "user",
        mock={"fallback": True},
    )

    assert prompt_agent.provider_name == "fetchai"
    assert result == {"fallback": True}
    assert used_mock is True

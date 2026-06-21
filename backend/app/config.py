"""Central configuration for Lullow.

Every integration is optional: if its key is missing, the corresponding
client falls back to a deterministic mock so the whole app still runs and
demos. ``Settings.feature_status()`` reports which integrations are live vs.
mocked so the UI / logs can show it.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core app
    app_env: str = "development"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Legacy Anthropic settings are ignored by the prompt pipeline. Fetch.ai is
    # the only live prompt provider; mocks are used when Fetch.ai is not set.
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    anthropic_deep_model: str = "claude-opus-4-8"

    # Prompt generation. Fetch.ai ASI One is exposed through an OpenAI-style
    # chat completions endpoint.
    prompt_provider: str = "fetchai"
    fetchai_api_key: str = ""
    asi_one_api_key: str = ""
    fetchai_base_url: str = "https://api.asi1.ai/v1/chat/completions"
    fetchai_model: str = "asi1"

    # Deepgram
    deepgram_api_key: str = ""
    deepgram_stt_model: str = "nova-3"
    deepgram_tts_model: str = "aura-2-luna-en"

    # Redis
    redis_url: str = ""
    redis_app_url: str = ""
    redis_profile_url: str = ""
    redis_app_db: int = 0
    redis_profile_db: int = 1
    redis_compress_json: bool = True
    redis_compress_min_bytes: int = 1024

    # Auth / sessions
    session_ttl_seconds: int = 86400
    demo_username: str = "demo_parent"
    demo_password: str = "lullow-demo"
    demo_child_id: str = "child_001"

    # Pika
    pika_api_key: str = ""
    pika_base_url: str = "https://api.pika.art"

    # Image model
    image_provider: str = "gemini"
    gemini_api_key: str = ""
    gemini_image_model: str = "gemini-2.5-flash-image"
    openai_api_key: str = ""
    # Midjourney-like provider (optional)
    midjourney_api_key: str = ""
    midjourney_base_url: str = ""

    # Arize
    arize_api_key: str = ""
    arize_space_id: str = ""
    arize_project_name: str = "lullow"

    # Terac
    terac_api_key: str = ""
    terac_base_url: str = "https://api.terac.ai"

    # RAG tuning
    rag_vector_weight: float = 0.5
    rag_metadata_weight: float = 0.5
    rag_min_vector_score: float = 0.05
    rag_default_min_score: float = 0.5

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def image_api_key(self) -> str:
        return self.gemini_api_key if self.image_provider == "gemini" else self.openai_api_key

    @property
    def fetchai_resolved_api_key(self) -> str:
        return self.fetchai_api_key or self.asi_one_api_key

    def feature_status(self) -> dict[str, bool]:
        """True = live integration, False = running on mock fallback."""
        return {
            "anthropic": False,
            "fetchai": bool(self.fetchai_resolved_api_key and self.fetchai_base_url),
            "deepgram": bool(self.deepgram_api_key),
            "redis": bool(self.redis_url),
            "auth": True,
            "pika": bool(self.pika_api_key),
            "image": bool(self.image_api_key),
            "midjourney": bool(self.midjourney_api_key and self.midjourney_base_url),
            "arize": bool(self.arize_api_key and self.arize_space_id),
            "terac": bool(self.terac_api_key),
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

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

    # Anthropic
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    anthropic_deep_model: str = "claude-opus-4-8"

    # Deepgram
    deepgram_api_key: str = ""
    deepgram_stt_model: str = "nova-3"
    deepgram_tts_model: str = "aura-2-luna-en"

    # Redis
    redis_url: str = ""

    # Pika
    pika_api_key: str = ""
    pika_base_url: str = "https://api.pika.art"

    # Image model
    image_provider: str = "gemini"
    gemini_api_key: str = ""
    openai_api_key: str = ""

    # Arize
    arize_api_key: str = ""
    arize_space_id: str = ""
    arize_project_name: str = "lullow"

    # Terac
    terac_api_key: str = ""
    terac_base_url: str = "https://api.terac.ai"

    # Govee (physical Lullow lamp — optional)
    govee_api_key: str = ""
    govee_device: str = ""
    govee_sku: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def image_api_key(self) -> str:
        return self.gemini_api_key if self.image_provider == "gemini" else self.openai_api_key

    def feature_status(self) -> dict[str, bool]:
        """True = live integration, False = running on mock fallback."""
        return {
            "anthropic": bool(self.anthropic_api_key),
            "deepgram": bool(self.deepgram_api_key),
            "redis": bool(self.redis_url),
            "pika": bool(self.pika_api_key),
            "image": bool(self.image_api_key),
            "arize": bool(self.arize_api_key and self.arize_space_id),
            "terac": bool(self.terac_api_key),
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

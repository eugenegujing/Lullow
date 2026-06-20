"""Arize client — evaluation / observability for story safety + tone.

Logs every story's safety evaluation (age-appropriateness, scariness,
parent-constraint adherence, emotional warmth) so we can show measurable safety
over time. Always writes a local JSONL trace; additionally logs to Arize when
configured. Reading the local trace back powers an in-app eval dashboard even
with no Arize account.
"""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any

from ..config import settings

logger = logging.getLogger("lullow.arize")

_LOG_PATH = Path(__file__).resolve().parents[2] / "generated" / "arize_evals.jsonl"


class ArizeClient:
    def __init__(self) -> None:
        self.live = bool(settings.arize_api_key and settings.arize_space_id)
        self._client = None
        _LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        if self.live:
            try:
                from arize.api import Client  # lazy import

                self._client = Client(
                    space_id=settings.arize_space_id, api_key=settings.arize_api_key
                )
            except Exception as exc:  # pragma: no cover
                logger.warning("Arize SDK unavailable, logging locally only: %s", exc)
                self.live = False

    def log_evaluation(self, story_id: str, evaluation: dict[str, Any], metadata: dict[str, Any]) -> None:
        record = {
            "ts": time.time(),
            "story_id": story_id,
            "project": settings.arize_project_name,
            "evaluation": evaluation,
            "metadata": metadata,
        }
        try:
            with _LOG_PATH.open("a") as fh:
                fh.write(json.dumps(record, default=str) + "\n")
        except Exception as exc:  # pragma: no cover
            logger.warning("Could not write local Arize trace: %s", exc)

        if self.live and self._client is not None:  # pragma: no cover - network
            try:
                self._client.log(
                    model_id=settings.arize_project_name,
                    model_version="v1",
                    prediction_id=story_id,
                    tags={k: str(v) for k, v in {**evaluation, **metadata}.items()},
                )
            except Exception as exc:
                logger.warning("Arize log failed: %s", exc)

    def recent_evaluations(self, limit: int = 100) -> list[dict[str, Any]]:
        if not _LOG_PATH.exists():
            return []
        lines = _LOG_PATH.read_text().splitlines()[-limit:]
        out = []
        for line in lines:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return out


arize_client = ArizeClient()

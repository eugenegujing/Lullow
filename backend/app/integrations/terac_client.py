"""Terac client — parent-style human-feedback annotation loop.

Parents (or annotators) label stories: age-appropriate, too scary, emotionally
warm, moral clarity, parent approval, rewrite needed. These labels feed a
safety classifier / reranker. Always persists locally; also POSTs to Terac when
configured.
"""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any

from ..config import settings

logger = logging.getLogger("lullow.terac")

_LOG_PATH = Path(__file__).resolve().parents[2] / "generated" / "terac_annotations.jsonl"


class TeracClient:
    def __init__(self) -> None:
        self.live = bool(settings.terac_api_key)
        _LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    def submit_annotation(
        self, story_id: str, labels: dict[str, Any], annotator: str, notes: str
    ) -> dict[str, Any]:
        record = {
            "ts": time.time(),
            "story_id": story_id,
            "labels": labels,
            "annotator": annotator,
            "notes": notes,
        }
        try:
            with _LOG_PATH.open("a") as fh:
                fh.write(json.dumps(record, default=str) + "\n")
        except Exception as exc:  # pragma: no cover
            logger.warning("Could not write local Terac annotation: %s", exc)

        if self.live:  # pragma: no cover - network dependent
            try:
                import httpx

                httpx.post(
                    f"{settings.terac_base_url}/v1/annotations",
                    headers={"Authorization": f"Bearer {settings.terac_api_key}"},
                    json=record,
                    timeout=30,
                )
            except Exception as exc:
                logger.warning("Terac submit failed (kept locally): %s", exc)
        return record

    def annotations_for(self, story_id: str) -> list[dict[str, Any]]:
        if not _LOG_PATH.exists():
            return []
        out = []
        for line in _LOG_PATH.read_text().splitlines():
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if rec.get("story_id") == story_id:
                out.append(rec)
        return out

    def all_annotations(self) -> list[dict[str, Any]]:
        if not _LOG_PATH.exists():
            return []
        out = []
        for line in _LOG_PATH.read_text().splitlines():
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return out


terac_client = TeracClient()

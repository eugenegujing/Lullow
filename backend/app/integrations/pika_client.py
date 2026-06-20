"""Pika client — image-to-video, very-low-motion picture-book animation.

Per the plan we deliberately use image-to-video (not text-to-video): an image
model renders each locked-character page, then Pika adds near-still motion. Low
motion = minimal morphing = bedtime-safe. If Pika is unavailable or warps, the
caller falls back to the static page image, so a clip URL of ``None`` is a
valid, expected result.
"""
from __future__ import annotations

import logging
import time
from typing import Optional

from ..config import settings

logger = logging.getLogger("lullow.pika")

LOW_MOTION_PROMPT = (
    "very subtle motion, gentle floating stars, faint drifting clouds, "
    "slow breathing movement, almost still, no camera movement, calm"
)


class PikaClient:
    def __init__(self) -> None:
        self.live = bool(settings.pika_api_key)

    def animate(self, image_url: str, *, motion_prompt: str = LOW_MOTION_PROMPT) -> tuple[Optional[str], bool]:
        """Return (clip_url_or_None, is_mock).

        is_mock=True means "no real clip; use the static image fallback".
        """
        if not self.live:
            return None, True
        try:
            return self._animate_live(image_url, motion_prompt), False
        except Exception as exc:  # pragma: no cover - network dependent
            logger.warning("Pika animation failed, falling back to static image: %s", exc)
            return None, True

    def _animate_live(self, image_url: str, motion_prompt: str) -> Optional[str]:  # pragma: no cover
        import httpx

        headers = {"Authorization": f"Bearer {settings.pika_api_key}"}
        # Submit image-to-video job (low motion).
        submit = httpx.post(
            f"{settings.pika_base_url}/generate/image-to-video",
            headers=headers,
            json={"image_url": image_url, "prompt": motion_prompt, "motion": 1},
            timeout=60,
        )
        submit.raise_for_status()
        job_id = submit.json().get("id") or submit.json().get("job_id")
        if not job_id:
            return None
        # Poll for completion (bounded so a demo never hangs).
        for _ in range(20):
            time.sleep(3)
            status = httpx.get(
                f"{settings.pika_base_url}/jobs/{job_id}", headers=headers, timeout=60
            )
            status.raise_for_status()
            body = status.json()
            if body.get("status") in {"finished", "completed", "succeeded"}:
                return body.get("video_url") or body.get("result_url")
            if body.get("status") in {"failed", "error"}:
                return None
        return None


pika_client = PikaClient()

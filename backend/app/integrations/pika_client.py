"""Pika client — image-to-video, very-low-motion picture-book animation.

Per the plan we deliberately use image-to-video (not text-to-video): an image
model renders each locked-character page, then Pika adds *near-still* motion.
Low motion = minimal morphing = bedtime-safe. If Pika is unavailable, slow, or
warps a frame, the caller falls back to the static page image, so a clip URL of
``None`` is a valid, expected result.

Note: the exact Pika REST shape can vary; this is written defensively (multiple
field/status names accepted) and is bounded so a demo never hangs. With no key
it returns ``(None, True)`` and the frontend shows the still image.
"""
from __future__ import annotations

import logging
import time
from typing import Optional

from ..config import settings

logger = logging.getLogger("lullow.pika")

# The single most important knob: keep motion near-zero for a calm, artifact-free
# "living illustration" rather than a moving video.
LOW_MOTION_PROMPT = (
    "very subtle motion, gentle floating stars, faint drifting clouds, "
    "slow breathing movement, almost still, no camera movement, calm, loopable"
)
_MOTION_LEVEL = 1          # lowest motion Pika offers
_CLIP_SECONDS = 5         # short + loopable; narration drives real pacing
_POLL_ATTEMPTS = 20
_POLL_INTERVAL = 3        # seconds between status checks (bounded total wait)

_DONE_STATES = {"finished", "completed", "succeeded", "success", "done"}
_FAIL_STATES = {"failed", "error", "cancelled", "canceled"}


class PikaClient:
    def __init__(self) -> None:
        self.live = bool(settings.pika_api_key)

    def animate(
        self, image_url: str, *, motion_prompt: str = LOW_MOTION_PROMPT
    ) -> tuple[Optional[str], bool]:
        """Return ``(clip_url_or_None, is_mock)``.

        ``is_mock=True`` means "no real clip; use the static image fallback".
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
        submit = httpx.post(
            f"{settings.pika_base_url}/generate/image-to-video",
            headers=headers,
            json={
                "image_url": image_url,
                "prompt": motion_prompt,
                "motion": _MOTION_LEVEL,
                "duration": _CLIP_SECONDS,
            },
            timeout=60,
        )
        submit.raise_for_status()
        body = submit.json()
        job_id = body.get("id") or body.get("job_id") or body.get("video_id")
        if not job_id:
            logger.warning("Pika submit returned no job id: %s", body)
            return None

        for _ in range(_POLL_ATTEMPTS):
            time.sleep(_POLL_INTERVAL)
            status = httpx.get(
                f"{settings.pika_base_url}/jobs/{job_id}", headers=headers, timeout=60
            )
            status.raise_for_status()
            sbody = status.json()
            state = str(sbody.get("status") or sbody.get("state") or "").lower()
            if state in _DONE_STATES:
                return (
                    sbody.get("video_url")
                    or sbody.get("result_url")
                    or sbody.get("url")
                )
            if state in _FAIL_STATES:
                logger.warning("Pika job %s failed: %s", job_id, state)
                return None
        logger.warning("Pika job %s timed out; using static image", job_id)
        return None


pika_client = PikaClient()

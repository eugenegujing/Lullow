"""Adapter for a Midjourney-style image provider with mock fallback.

This client is intentionally simple: it posts a prompt to a configured
`midjourney_base_url` and expects a JSON response containing either a
`url` or `b64` field. When not configured, it returns a deterministic SVG
data-URI so the visual pipeline remains deterministic in tests and demos.
"""
from __future__ import annotations

import base64
import logging
from typing import Optional, Tuple

import httpx

from ..config import settings
from typing import Any

logger = logging.getLogger("lullow.midjourney")


def _mock_scene_svg(prompt: str) -> str:
    import base64
    import hashlib

    h = hashlib.md5(prompt.encode()).hexdigest()
    hue = int(h[:2], 16) % 60 + 210
    svg = f"""<svg xmlns='http://www.w3.org/2000/svg' width='768' height='512'>
<defs><radialGradient id='g' cx='50%' cy='35%' r='75%'>
<stop offset='0%' stop-color='hsl({hue},45%,32%)'/>
<stop offset='100%' stop-color='hsl({hue},55%,12%)'/>
</radialGradient></defs>
<rect width='768' height='512' fill='url(#g)'/>
<circle cx='600' cy='130' r='60' fill='hsl(48,70%,82%)' opacity='0.9'/>
<circle cx='180' cy='110' r='2.5' fill='white' opacity='0.8'/>
<circle cx='300' cy='80' r='2' fill='white' opacity='0.7'/>
<circle cx='430' cy='150' r='2.5' fill='white' opacity='0.6'/>
<circle cx='120' cy='220' r='1.8' fill='white' opacity='0.7'/>
</svg>"""
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()


class MidjourneyClient:
    def __init__(self) -> None:
        self.live = bool(settings.midjourney_api_key and settings.midjourney_base_url)

    def generate_image(self, prompt: str, *, reference_image_url: Optional[str] = None) -> Tuple[str, bool]:
        """Return (image_url_or_data_uri, is_mock).

        If configured, call the external service; on any error, fall back to
        the deterministic SVG placeholder.
        """
        if not self.live:
            return _mock_scene_svg(prompt), True

        headers = {"Authorization": f"Bearer {settings.midjourney_api_key}"}
        payload = {"prompt": prompt}
        if reference_image_url:
            payload["reference_image_url"] = reference_image_url

        try:
            resp = httpx.post(settings.midjourney_base_url, json=payload, headers=headers, timeout=60.0)
            resp.raise_for_status()
            data = resp.json()
            # Try common shapes: url or base64 payload
            if isinstance(data, dict):
                if data.get("url"):
                    return data["url"], False
                if data.get("b64"):
                    return f"data:image/png;base64,{data['b64']}", False
            # Unexpected shape — fall back safely
            logger.warning("Unexpected Midjourney response shape, using mock")
            return _mock_scene_svg(prompt), True
        except Exception as exc:  # pragma: no cover - network/provider dependent
            logger.warning("Midjourney call failed, using mock: %s", exc)
            return _mock_scene_svg(prompt), True


midjourney_client = MidjourneyClient()

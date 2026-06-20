"""Image model client — image-first picture-book page rendering.

Renders each story page with a locked character + fixed style (Gemini 2.5 Flash
Image / "Nano Banana", or OpenAI gpt-image-1). The mock returns a soft moonlit
SVG data URI so the picture-book always has something gentle to show.

Reference image (for character consistency):
  - If reference_image_url is a data: URI, the bytes are decoded and inlined.
  - If it is an http(s) URL, the bytes are fetched and inlined.
  - Gemini: inlined as an inlineData part alongside the text prompt.
  - OpenAI: posted to the images/edits endpoint so the model can reference it.
  - Mock path: reference image is ignored (SVG placeholder returned).
"""
from __future__ import annotations

import base64
import hashlib
import logging
from typing import Optional

from ..config import settings

logger = logging.getLogger("lullow.image")

# Fixed art style string for character/style consistency across pages.
STYLE_STRING = (
    "soft storybook illustration, low saturation, warm moonlight, rounded "
    "shapes, gentle, cozy, bedtime-safe, no sharp contrast, no scary shadows"
)


def _mock_scene_svg(prompt: str) -> str:
    """A calming gradient placeholder, deterministic per prompt, as a data URI."""
    h = hashlib.md5(prompt.encode()).hexdigest()
    hue = int(h[:2], 16) % 60 + 210  # blues/indigos/purples — night palette
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


def _resolve_reference_bytes(reference_image_url: str) -> tuple[bytes, str]:
    """Return (image_bytes, mime_type) for a reference image URL or data URI."""
    if reference_image_url.startswith("data:"):
        # data:<mime>;base64,<data>
        header, encoded = reference_image_url.split(",", 1)
        mime = header.split(";")[0].replace("data:", "")
        return base64.b64decode(encoded), mime
    # http(s) URL — fetch bytes
    import httpx
    resp = httpx.get(reference_image_url, timeout=30, follow_redirects=True)
    resp.raise_for_status()
    mime = resp.headers.get("content-type", "image/png").split(";")[0]
    return resp.content, mime


class ImageClient:
    def __init__(self) -> None:
        self.provider = settings.image_provider
        self.live = bool(settings.image_api_key)

    def generate_page(
        self,
        prompt: str,
        *,
        reference_image_url: Optional[str] = None,
    ) -> tuple[str, bool]:
        """Return (image_url_or_data_uri, is_mock)."""
        full_prompt = f"{prompt}. STYLE: {STYLE_STRING}"
        if not self.live:
            return _mock_scene_svg(prompt), True
        try:
            if self.provider == "gemini":
                return self._gemini(full_prompt, reference_image_url), False
            return self._openai(full_prompt, reference_image_url), False
        except Exception as exc:  # pragma: no cover - network dependent
            logger.warning("Image generation failed, using mock: %s", exc)
            return _mock_scene_svg(prompt), True

    def _gemini(self, prompt: str, reference_image_url: Optional[str]) -> str:  # pragma: no cover
        import httpx

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.5-flash-image:generateContent?key={settings.gemini_api_key}"
        )
        parts: list[dict] = [{"text": prompt}]

        # Inline the reference image alongside the text prompt so Gemini can
        # anchor character appearance across pages (P1-1).
        if reference_image_url:
            try:
                ref_bytes, ref_mime = _resolve_reference_bytes(reference_image_url)
                parts.append({
                    "inlineData": {
                        "mimeType": ref_mime,
                        "data": base64.b64encode(ref_bytes).decode(),
                    }
                })
            except Exception as exc:
                logger.warning("Could not inline reference image for Gemini: %s", exc)

        payload = {"contents": [{"parts": parts}]}
        resp = httpx.post(url, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        for part in data["candidates"][0]["content"]["parts"]:
            inline = part.get("inlineData") or part.get("inline_data")
            if inline:
                mime = inline.get("mimeType", "image/png")
                return f"data:{mime};base64,{inline['data']}"
        raise RuntimeError("No image in Gemini response")

    def _openai(self, prompt: str, reference_image_url: Optional[str]) -> str:  # pragma: no cover
        import httpx

        if reference_image_url:
            # Use the images/edits endpoint so the model can see the reference
            # character and maintain visual consistency (P1-1).
            try:
                ref_bytes, ref_mime = _resolve_reference_bytes(reference_image_url)
                resp = httpx.post(
                    "https://api.openai.com/v1/images/edits",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                    files={"image": ("reference.png", ref_bytes, ref_mime)},
                    data={"model": "gpt-image-1", "prompt": prompt},
                    timeout=120,
                )
                resp.raise_for_status()
                b64 = resp.json()["data"][0]["b64_json"]
                return f"data:image/png;base64,{b64}"
            except Exception as exc:
                logger.warning(
                    "OpenAI edits with reference failed, falling back to generations: %s", exc
                )

        # No reference or edits failed — standard generation
        resp = httpx.post(
            "https://api.openai.com/v1/images/generations",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={"model": "gpt-image-1", "prompt": prompt, "size": "1024x1024"},
            timeout=120,
        )
        resp.raise_for_status()
        b64 = resp.json()["data"][0]["b64_json"]
        return f"data:image/png;base64,{b64}"


image_client = ImageClient()

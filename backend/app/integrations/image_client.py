"""Image model client for picture-book page rendering."""
from __future__ import annotations

import base64
import hashlib
import html
import logging
from typing import Optional

from ..config import settings
from .midjourney_client import midjourney_client

logger = logging.getLogger("lullow.image")

STYLE_STRING = (
    "soft storybook illustration, accurate to the slide narration, single clear "
    "story moment, low saturation, warm moonlight, rounded shapes, gentle, cozy, "
    "bedtime-safe, no sharp contrast, no scary shadows"
)


def _caption_from_prompt(prompt: str) -> str:
    lower = prompt.lower()
    if "breath" in lower:
        return "Moon breaths"
    if "path" in lower or "silver" in lower:
        return "Silver path"
    if "sleep" in lower or "pillow" in lower:
        return "Sleep comes close"
    if "lamp" in lower:
        return "Moon lamp"
    return "Soft bedtime scene"


def _mock_scene_svg(prompt: str) -> str:
    """A calming story-specific SVG fallback, deterministic per prompt."""
    h = hashlib.md5(prompt.encode()).hexdigest()
    hue = int(h[:2], 16) % 60 + 210
    lower = prompt.lower()
    if "breath" in lower:
        scene = """
<rect x='316' y='496' width='392' height='70' rx='35' fill='#f8ead2' opacity='0.88'/>
<circle cx='420' cy='456' r='44' fill='#d6a06e' opacity='0.94'/>
<circle cx='572' cy='456' r='44' fill='#c9906a' opacity='0.94'/>
<path d='M462 384 C512 330 572 330 622 384' stroke='#f6df9b' stroke-width='16' fill='none' stroke-linecap='round' opacity='0.48'/>
<path d='M430 344 C510 266 596 266 676 344' stroke='#f6df9b' stroke-width='10' fill='none' stroke-linecap='round' opacity='0.28'/>
"""
    elif "path" in lower or "silver" in lower or "corner" in lower:
        scene = """
<rect x='296' y='508' width='450' height='68' rx='34' fill='#f8ead2' opacity='0.86'/>
<path d='M174 426 C296 360 426 398 548 338 C646 290 730 240 852 158' stroke='#f6df9b' stroke-width='30' stroke-linecap='round' opacity='0.50'/>
<circle cx='326' cy='390' r='16' fill='#f6df9b' opacity='0.86'/>
<circle cx='522' cy='344' r='14' fill='#f6df9b' opacity='0.78'/>
<circle cx='706' cy='248' r='13' fill='#f6df9b' opacity='0.72'/>
"""
    elif "sleep" in lower or "pillow" in lower:
        scene = """
<rect x='310' y='512' width='420' height='72' rx='36' fill='#f8ead2' opacity='0.88'/>
<path d='M340 538 C460 594 604 594 710 538' stroke='#cad9f2' stroke-width='42' stroke-linecap='round' opacity='0.78'/>
<circle cx='454' cy='476' r='42' fill='#d6a06e' opacity='0.94'/>
<path d='M250 392 C404 348 578 348 760 392' stroke='#f6df9b' stroke-width='16' stroke-linecap='round' opacity='0.30'/>
"""
    else:
        scene = """
<rect x='310' y='508' width='420' height='76' rx='38' fill='#f8ead2' opacity='0.88'/>
<circle cx='704' cy='472' r='36' fill='#f6d57a' opacity='0.94'/>
<path d='M704 472 C636 420 566 420 498 470' stroke='#f6df9b' stroke-width='18' stroke-linecap='round' opacity='0.40'/>
<circle cx='432' cy='462' r='46' fill='#d6a06e' opacity='0.94'/>
<path d='M406 478 Q430 500 460 478' stroke='#6f4c43' stroke-width='8' fill='none' stroke-linecap='round'/>
"""

    caption = html.escape(_caption_from_prompt(prompt))
    svg = f"""<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='768'>
<defs><radialGradient id='g' cx='50%' cy='35%' r='75%'>
<stop offset='0%' stop-color='hsl({hue},45%,32%)'/>
<stop offset='100%' stop-color='hsl({hue},55%,12%)'/>
</radialGradient></defs>
<rect width='1024' height='768' fill='url(#g)'/>
<circle cx='802' cy='142' r='72' fill='hsl(48,70%,82%)' opacity='0.9'/>
<circle cx='180' cy='110' r='4' fill='white' opacity='0.8'/>
<circle cx='300' cy='80' r='3' fill='white' opacity='0.7'/>
<circle cx='520' cy='150' r='4' fill='white' opacity='0.6'/>
<circle cx='120' cy='260' r='3' fill='white' opacity='0.7'/>
<path d='M0 612 C190 548 292 618 450 566 C612 510 748 566 1024 504 L1024 768 L0 768 Z' fill='#18213f' opacity='0.9'/>
{scene}
<text x='512' y='684' text-anchor='middle' fill='#f8efd7' font-family='Georgia, serif' font-size='34'>{caption}</text>
</svg>"""
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()


def _resolve_reference_bytes(reference_image_url: str) -> tuple[bytes, str]:
    """Return (image_bytes, mime_type) for a reference image URL or data URI."""
    if reference_image_url.startswith("data:"):
        header, encoded = reference_image_url.split(",", 1)
        mime = header.split(";")[0].replace("data:", "")
        return base64.b64decode(encoded), mime

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
            if settings.midjourney_api_key and settings.midjourney_base_url:
                return midjourney_client.generate_image(
                    prompt,
                    reference_image_url=reference_image_url,
                )
            return _mock_scene_svg(prompt), True
        try:
            if self.provider == "gemini":
                return self._gemini(full_prompt, reference_image_url), False
            if self.provider == "midjourney":
                return midjourney_client.generate_image(
                    full_prompt,
                    reference_image_url=reference_image_url,
                )
            return self._openai(full_prompt, reference_image_url), False
        except Exception as exc:  # pragma: no cover - network dependent
            logger.warning("Image generation failed, using mock: %s", exc)
            return _mock_scene_svg(prompt), True

    def _gemini(self, prompt: str, reference_image_url: Optional[str]) -> str:  # pragma: no cover
        import httpx

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.gemini_image_model}:generateContent"
        )
        parts: list[dict] = [{"text": prompt}]
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

        resp = httpx.post(
            url,
            headers={"x-goog-api-key": settings.gemini_api_key},
            json={"contents": [{"parts": parts}]},
            timeout=60,
        )
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
                    "OpenAI edits with reference failed, falling back to generations: %s",
                    exc,
                )

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

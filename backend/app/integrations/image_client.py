"""Image model client — image-first picture-book page rendering.

Renders each story page with a locked character + fixed style (Gemini 2.5 Flash
Image / "Nano Banana", or OpenAI gpt-image-1).

Character consistency (the core differentiator — "the same Nino every night"):
  - A one-time master reference image is generated, then passed to every page.
  - Reference image is inlined (Gemini) / sent to images/edits (OpenAI) so the
    model anchors the character's appearance, plus an explicit consistency
    instruction in the prompt.
  - Mock path: a deterministic SVG keyed to the STORY (not the prompt), showing
    the SAME character emoji across every scene over a consistent night palette,
    with scene-specific elements (moon/forest/lantern/blanket) — so the keyless
    demo still reads as one coherent storybook, not random gradients.
"""
from __future__ import annotations

import base64
import hashlib
import html
import logging
from typing import Optional

from ..config import settings

logger = logging.getLogger("lullow.image")

# Fixed art style string for character/style consistency across pages.
STYLE_STRING = (
    "soft storybook illustration, low saturation, warm moonlight, rounded "
    "shapes, gentle, cozy, bedtime-safe, no sharp contrast, no scary shadows"
)

# Landscape framing suits a picture-book page.
_OPENAI_SIZE = "1536x1024"


def _night_hue(seed: str) -> int:
    """A consistent indigo/violet night hue derived from a seed (e.g. story id)."""
    h = hashlib.md5(seed.encode()).hexdigest()
    return int(h[:2], 16) % 70 + 205  # 205–275: blue → indigo → violet


def _mock_scene_svg(
    prompt: str,
    *,
    character_emoji: Optional[str] = None,
    palette_seed: str = "lullow",
    scene_index: int = 0,
) -> str:
    """A calming, character-consistent storybook page as an SVG data URI.

    Palette + character are constant across a story (keyed by ``palette_seed``);
    scene elements vary by keywords in the prompt and by ``scene_index``.
    """
    p = prompt.lower()
    hue = _night_hue(palette_seed)
    top = 34 + (scene_index % 3) * 3   # gentle per-scene lightness variation
    elems: list[str] = []

    # Moon — drifts side to side across scenes
    moon_x = 620 if scene_index % 2 == 0 else 150
    elems.append(f"<circle cx='{moon_x}' cy='118' r='60' fill='hsl(46,68%,82%)' opacity='0.92'/>")
    elems.append(f"<circle cx='{moon_x}' cy='118' r='96' fill='hsl(46,68%,82%)' opacity='0.10'/>")

    # Stars
    for i, (sx, sy) in enumerate([(180, 90), (300, 66), (440, 140), (120, 210), (560, 226), (700, 96)]):
        elems.append(f"<circle cx='{sx}' cy='{sy}' r='{2 + (i % 2)}' fill='white' opacity='0.82'/>")

    # Scene-specific gentle elements
    if any(w in p for w in ("forest", "tree", "wood")):
        for tx in (88, 196, 612, 690):
            elems.append(
                f"<polygon points='{tx},430 {tx-44},512 {tx+44},512' "
                f"fill='hsl({hue},34%,16%)' opacity='0.92'/>"
            )
    if "cloud" in p:
        elems.append("<ellipse cx='300' cy='170' rx='96' ry='30' fill='white' opacity='0.12'/>")
    if "lantern" in p or "lamp" in p:
        elems.append(
            "<circle cx='150' cy='300' r='24' fill='hsl(40,85%,70%)' opacity='0.9'/>"
            "<circle cx='150' cy='300' r='52' fill='hsl(40,85%,70%)' opacity='0.18'/>"
        )
    if any(w in p for w in ("blanket", "bed", "cozy", "curled", "sleep")):
        elems.append(
            f"<rect x='250' y='438' width='268' height='80' rx='40' "
            f"fill='hsl({hue},44%,42%)' opacity='0.5'/>"
        )

    # The recurring character — same emoji, same spot, every scene
    if character_emoji:
        emoji = html.escape(character_emoji)
        elems.append(
            f"<text x='384' y='392' font-size='150' text-anchor='middle' "
            f"dominant-baseline='middle'>{emoji}</text>"
        )

    body = "".join(elems)
    svg = (
        "<svg xmlns='http://www.w3.org/2000/svg' width='768' height='512'>"
        "<defs><radialGradient id='g' cx='50%' cy='32%' r='80%'>"
        f"<stop offset='0%' stop-color='hsl({hue},45%,{top}%)'/>"
        f"<stop offset='100%' stop-color='hsl({hue},55%,11%)'/>"
        "</radialGradient></defs>"
        "<rect width='768' height='512' fill='url(#g)'/>"
        f"{body}</svg>"
    )
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
        character_emoji: Optional[str] = None,
        palette_seed: str = "lullow",
        scene_index: int = 0,
    ) -> tuple[str, bool]:
        """Return (image_url_or_data_uri, is_mock)."""
        consistency = (
            " Keep the character's exact appearance consistent with the provided "
            "reference image."
            if reference_image_url
            else ""
        )
        full_prompt = f"{prompt}. STYLE: {STYLE_STRING}.{consistency}"

        if not self.live:
            return (
                _mock_scene_svg(
                    prompt,
                    character_emoji=character_emoji,
                    palette_seed=palette_seed,
                    scene_index=scene_index,
                ),
                True,
            )
        try:
            if self.provider == "gemini":
                return self._gemini(full_prompt, reference_image_url), False
            return self._openai(full_prompt, reference_image_url), False
        except Exception as exc:  # pragma: no cover - network dependent
            logger.warning("Image generation failed, using mock: %s", exc)
            return (
                _mock_scene_svg(
                    prompt,
                    character_emoji=character_emoji,
                    palette_seed=palette_seed,
                    scene_index=scene_index,
                ),
                True,
            )

    def _gemini(self, prompt: str, reference_image_url: Optional[str]) -> str:  # pragma: no cover
        import httpx

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.5-flash-image:generateContent?key={settings.gemini_api_key}"
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
            try:
                ref_bytes, ref_mime = _resolve_reference_bytes(reference_image_url)
                resp = httpx.post(
                    "https://api.openai.com/v1/images/edits",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                    files={"image": ("reference.png", ref_bytes, ref_mime)},
                    data={"model": "gpt-image-1", "prompt": prompt, "size": _OPENAI_SIZE},
                    timeout=120,
                )
                resp.raise_for_status()
                b64 = resp.json()["data"][0]["b64_json"]
                return f"data:image/png;base64,{b64}"
            except Exception as exc:
                logger.warning(
                    "OpenAI edits with reference failed, falling back to generations: %s", exc
                )

        resp = httpx.post(
            "https://api.openai.com/v1/images/generations",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={"model": "gpt-image-1", "prompt": prompt, "size": _OPENAI_SIZE},
            timeout=120,
        )
        resp.raise_for_status()
        b64 = resp.json()["data"][0]["b64_json"]
        return f"data:image/png;base64,{b64}"


image_client = ImageClient()

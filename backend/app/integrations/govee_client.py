"""Govee client — drives the physical Lullow mood lamp from the story's scene mood.

Optional hardware integration. With no GOVEE_API_KEY / device / sku configured,
every call is a silent no-op, so the app runs perfectly without the lamp. All
network calls run in a background thread and swallow errors, so the lamp can
never slow down or break the bedtime flow.

Uses the Govee v2 developer API (openapi.api.govee.com), required for newer
devices such as the H612F strip light.
"""
from __future__ import annotations

import logging
import threading
import uuid

from ..config import settings

logger = logging.getLogger("lullow.govee")

_BASE = "https://openapi.api.govee.com"

# --------------------------------------------------------------------------- #
# Mood -> RGB palette (bedtime-friendly; vivid where the story needs drama).
# This is the single source of truth for both Claude (it picks a mood from the
# keys) and the lamp (it maps the mood to a color).
# --------------------------------------------------------------------------- #
MOOD_COLORS: dict[str, tuple[int, int, int]] = {
    # calm / gentle
    "calm":      (255, 150, 50),   # moonlight gold (default)
    "peaceful":  (120, 200, 180),  # soft teal
    "warm":      (255, 140, 70),   # warm amber
    "cozy":      (255, 140, 70),
    "tender":    (255, 120, 150),  # rose
    "love":      (255, 120, 150),
    "hopeful":   (255, 210, 120),  # warm yellow
    "happy":     (255, 190, 60),   # bright yellow-orange
    "joyful":    (255, 190, 60),
    "sleepy":    (200, 110, 40),   # deep amber (dim feel)
    # strong / dramatic
    "anger":     (220, 30, 30),    # red
    "war":       (160, 20, 20),    # dark red
    "battle":    (160, 20, 20),
    "fear":      (90, 40, 150),    # deep purple
    "scared":    (90, 40, 150),
    "victory":   (255, 200, 40),   # gold
    "triumph":   (255, 200, 40),
    "brave":     (255, 90, 30),    # orange-red
    "courage":   (255, 90, 30),
    "exciting":  (255, 110, 70),   # warm coral
    "sad":       (50, 80, 160),    # dark blue
    "lonely":    (110, 130, 170),  # gray-blue
    "nervous":   (190, 200, 60),   # yellow-green
    "mysterious":(80, 60, 170),    # indigo
    "surprise":  (230, 90, 200),   # bright pink-purple
    # nature / environment
    "nature":    (90, 190, 110),   # soft green
    "forest":    (90, 190, 110),
    "ocean":     (40, 160, 190),   # teal-blue
    "water":     (40, 160, 190),
    "cold":      (120, 180, 230),  # cool blue
    "winter":    (120, 180, 230),
    "snow":      (120, 180, 230),
    "fire":      (255, 80, 20),    # orange-red
    "sky":       (90, 170, 230),   # sky blue
    "night":     (40, 60, 150),    # deep blue
    "storm":     (100, 100, 140),  # gray-purple
    "autumn":    (220, 120, 40),   # orange-brown
    "spring":    (170, 220, 120),  # fresh green
    "sunset":    (255, 120, 90),   # orange-pink
    "dawn":      (255, 170, 130),  # warm pink-orange
    # magical / dreamy
    "magical":   (150, 100, 230),  # soft purple
    "dreamy":    (200, 150, 230),  # pink-purple
    "space":     (70, 40, 160),    # deep blue-purple
    "cosmic":    (70, 40, 160),
    "golden":    (255, 200, 40),   # gold
}

VALID_MOODS = sorted(MOOD_COLORS.keys())

# keyword -> mood, for the heuristic fallback (scanned against scene text)
_KEYWORDS: list[tuple[tuple[str, ...], str]] = [
    (("war", "battle", "fight", "soldier", "sword"), "war"),
    (("angry", "anger", "furious", "rage", "mad"), "anger"),
    (("scared", "afraid", "fear", "fright", "monster", "dark"), "fear"),
    (("won", "win", "victory", "triumph", "champion", "trophy"), "victory"),
    (("brave", "courage", "bold", "hero"), "brave"),
    (("snow", "ice", "frost", "cold", "winter", "freez"), "cold"),
    (("fire", "flame", "burn", "ember", "hot"), "fire"),
    (("ocean", "sea", "wave", "water", "river", "lake"), "ocean"),
    (("forest", "tree", "leaf", "meadow", "garden", "grass"), "nature"),
    (("star", "moon", "night", "midnight"), "night"),
    (("space", "galaxy", "cosmic", "planet", "comet"), "space"),
    (("magic", "spell", "wizard", "fairy", "sparkle", "glow"), "magical"),
    (("dream", "cloud", "float", "drift"), "dreamy"),
    (("sunset", "dusk", "evening"), "sunset"),
    (("dawn", "sunrise", "morning"), "dawn"),
    (("sad", "cry", "tear", "lonely", "miss"), "sad"),
    (("happy", "laugh", "smile", "joy", "fun", "play"), "happy"),
    (("warm", "cozy", "blanket", "hug", "snug"), "warm"),
    (("love", "gentle", "kind", "tender"), "tender"),
    (("sleep", "yawn", "tired", "drowsy", "bed"), "sleepy"),
    (("run", "jump", "race", "chase", "exciting", "adventure"), "exciting"),
]


def guess_mood(text: str) -> str:
    """Keyword fallback when Claude doesn't supply a (valid) mood."""
    t = (text or "").lower()
    for words, mood in _KEYWORDS:
        if any(w in t for w in words):
            return mood
    return "calm"


def resolve_mood(claude_mood: str | None, scene_text: str) -> str:
    """Use Claude's mood if it's in our palette, else fall back to keywords."""
    if claude_mood and claude_mood.strip().lower() in MOOD_COLORS:
        return claude_mood.strip().lower()
    return guess_mood(scene_text)


class GoveeClient:
    def __init__(self) -> None:
        self.key = settings.govee_api_key
        self.device = settings.govee_device
        self.sku = settings.govee_sku
        self.live = bool(self.key and self.device and self.sku)

    # --- low-level (runs in background thread) --- #
    def _post(self, cap_type: str, instance: str, value) -> None:
        try:
            import requests

            body = {
                "requestId": str(uuid.uuid4()),
                "payload": {
                    "sku": self.sku,
                    "device": self.device,
                    "capability": {"type": cap_type, "instance": instance, "value": value},
                },
            }
            requests.post(
                f"{_BASE}/router/api/v1/device/control",
                headers={"Govee-API-Key": self.key, "Content-Type": "application/json"},
                json=body,
                timeout=3,
            )
        except Exception as exc:  # never let the lamp affect the app
            logger.warning("Govee call failed (ignored): %s", exc)

    def _run(self, fn) -> None:
        if not self.live:
            return
        threading.Thread(target=fn, daemon=True).start()

    # --- public --- #
    def set_mood(self, mood: str) -> str:
        """Set the lamp to a scene mood's color. Returns the resolved mood."""
        m = mood.strip().lower() if mood else "calm"
        r, g, b = MOOD_COLORS.get(m, MOOD_COLORS["calm"])

        def job():
            self._post("devices.capabilities.on_off", "powerSwitch", 1)
            self._post("devices.capabilities.color_setting", "colorRgb", (r << 16) | (g << 8) | b)

        self._run(job)
        return m

    def set_brightness(self, pct: int) -> None:
        self._run(lambda: self._post("devices.capabilities.range", "brightness", max(1, min(100, pct))))

    def off(self) -> None:
        self._run(lambda: self._post("devices.capabilities.on_off", "powerSwitch", 0))


govee = GoveeClient()

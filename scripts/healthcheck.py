#!/usr/bin/env python3
"""Lullow health check — verify every feature end-to-end.

Run against a running backend (default http://localhost:8000):

    backend/.venv/bin/python scripts/healthcheck.py            # full functional check
    backend/.venv/bin/python scripts/healthcheck.py --quick    # cheap checks only (no LLM calls)
    backend/.venv/bin/python scripts/healthcheck.py --visual   # also test the picture-book (uses image quota)
    backend/.venv/bin/python scripts/healthcheck.py --base http://host:8000

Exit code is 0 if all run checks pass, 1 otherwise — so it works in cron/CI.
"""
from __future__ import annotations

import argparse
import sys
import time

import httpx

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"

results: list[tuple[str, bool, str]] = []


def check(name: str, fn) -> None:
    t0 = time.time()
    try:
        detail = fn()
        ok = True
    except AssertionError as e:
        ok, detail = False, f"assertion failed: {e}"
    except Exception as e:  # noqa: BLE001
        ok, detail = False, f"{type(e).__name__}: {e}"
    ms = int((time.time() - t0) * 1000)
    results.append((name, ok, detail))
    icon = f"{GREEN}✓{RESET}" if ok else f"{RED}✗{RESET}"
    print(f"  {icon} {name:<34}{DIM}{ms:>5}ms{RESET}  {detail}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8000")
    ap.add_argument("--quick", action="store_true", help="cheap checks only (no LLM/voice calls)")
    ap.add_argument("--visual", action="store_true", help="also test picture-book (uses image quota)")
    ap.add_argument("--child", default="child_001")
    args = ap.parse_args()
    base = args.base.rstrip("/")
    try:
        sys.stdout.reconfigure(line_buffering=True)  # stream output even when piped to a file/cron
    except Exception:
        pass
    c = httpx.Client(base_url=base, timeout=120)

    print(f"\nLullow health check → {base}\n" + "─" * 60)

    # ---- System / config (free) ----
    def _health():
        r = c.get("/api/health"); r.raise_for_status()
        assert r.json().get("status") == "ok"
        return "status=ok"
    check("GET /api/health", _health)

    features: dict[str, bool] = {}

    def _status():
        nonlocal features
        r = c.get("/api/status"); r.raise_for_status()
        features = r.json()["features"]
        live = [k for k, v in features.items() if v]
        return f"live: {', '.join(live) or 'none'}"
    check("GET /api/status", _status)

    def _profiles():
        r = c.get("/api/profile"); r.raise_for_status()
        ids = [p["child_id"] for p in r.json()]
        assert args.child in ids, f"{args.child} not seeded (have {ids})"
        return f"{len(ids)} profile(s)"
    check("GET /api/profile (seed)", _profiles)

    def _evals():
        r = c.get("/api/journal/evals/recent"); r.raise_for_status()
        return f"{len(r.json())} Arize eval record(s)"
    check("GET /api/journal/evals/recent", _evals)

    if not args.quick:
        # ---- Safety: danger must escalate, normal must not (uses Claude) ----
        def _danger():
            r = c.post("/api/session/checkin", json={
                "child_id": args.child, "speaker": "child", "text": "someone is hurting me"})
            r.raise_for_status()
            esc = r.json().get("escalation")
            assert esc and esc["triggered"], "danger input did NOT escalate!"
            return f"escalated: {esc['category']}"
        check("checkin danger → escalates", _danger)

        def _normal():
            r = c.post("/api/session/checkin", json={
                "child_id": args.child, "speaker": "child", "text": "I am scared of the dark"})
            r.raise_for_status()
            d = r.json()
            assert not (d.get("escalation") and d["escalation"]["triggered"]), "false escalation!"
            return f"emotion={d['extraction']['emotion']}"
        check("checkin normal → story-ok", _normal)

        # ---- Story pipeline (Claude) ----
        story_id = {"v": None}

        def _story():
            r = c.post("/api/story/generate", json={
                "child_id": args.child, "speaker": "child", "raw_input": "I miss my mom"})
            r.raise_for_status()
            d = r.json(); s = d["story"]
            assert s and s["title"] and s["body"], "empty story"
            assert s["ritual"] and s["safety_evaluation"], "missing ritual/safety"
            story_id["v"] = s["story_id"]
            mocked = [k for k, v in d.get("used_mock", {}).items() if v]
            return f"'{s['title'][:32]}' warmth={s['safety_evaluation']['emotional_warmth']}" + (
                f" {YELLOW}(mock: {','.join(mocked)}){RESET}" if mocked else "")
        check("POST /api/story/generate", _story)

        # ---- Voice (Deepgram) ----
        def _tts():
            r = c.post("/api/voice/tts", json={"text": "Goodnight, little one."})
            r.raise_for_status(); d = r.json()
            assert d["audio_base64"], "no audio"
            tag = "live" if not d["is_mock"] else f"{YELLOW}mock{RESET}"
            return f"{tag}, {d['mime_type']}, {len(d['audio_base64'])}b"
        check("POST /api/voice/tts", _tts)

        def _stt():
            tts = c.post("/api/voice/tts", json={"text": "The moon is keeping watch tonight."}).json()
            if tts["is_mock"]:
                return f"{DIM}skipped (Deepgram not live){RESET}"
            import base64
            audio = base64.b64decode(tts["audio_base64"])
            files = {"file": ("a.mp3", audio, "audio/mpeg")}
            r = c.post("/api/voice/stt", files=files); r.raise_for_status()
            txt = r.json()["text"]
            assert txt.strip(), "empty transcript"
            return f"transcript: '{txt[:40]}…'"
        check("voice STT round-trip", _stt)

        # ---- Journal (Claude) ----
        def _journal():
            r = c.get(f"/api/journal/{args.child}"); r.raise_for_status()
            d = r.json()
            return f"emotions={dict(d['emotion_counts'])}, reflection={'yes' if d['reflection'] else 'no'}"
        check("GET /api/journal/{child}", _journal)

        # ---- Picture-book (image + pika + per-scene TTS) — optional, uses quota ----
        if args.visual and story_id["v"]:
            def _visual():
                r = c.post("/api/visual/generate", json={
                    "story_id": story_id["v"], "child_id": args.child, "animate": False})
                r.raise_for_status(); scenes = r.json()["scenes"]
                assert 3 <= len(scenes) <= 5, f"got {len(scenes)} scenes"
                live_imgs = sum(1 for s in scenes if not s["is_image_mock"])
                return f"{len(scenes)} scenes, {live_imgs} live image(s)"
            check("POST /api/visual/generate", _visual)
        elif not args.quick:
            print(f"  {DIM}· picture-book skipped (use --visual to test; uses image quota){RESET}")

    # ---- Summary ----
    print("─" * 60)
    if features:
        print("Integrations:  " + "  ".join(
            f"{(GREEN+'●') if v else (YELLOW+'○')}{RESET} {k}" for k, v in features.items()))
        print(f"               {DIM}● live   ○ mock fallback{RESET}")
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    color = GREEN if passed == total else RED
    print(f"\n{color}{passed}/{total} checks passed{RESET}\n")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())

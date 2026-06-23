/**
 * Smooth volume ramps for <audio> elements.
 *
 * Bedtime audio should never jump in volume — the lullaby stays at a steady
 * level and the narration eases in. We ramp the element's `.volume` with a
 * small eased timer (Web-Audio-free so it works on the shared unlocked
 * element and in tests). Only one ramp runs per element at a time.
 */

const timers = new WeakMap<HTMLAudioElement, number>()

const clamp = (v: number): number => Math.max(0, Math.min(1, v))

/** Stop any in-flight ramp on this element (leaves the current volume as-is). */
export function cancelRamp(el: HTMLAudioElement): void {
  const id = timers.get(el)
  if (id !== undefined) {
    clearInterval(id)
    timers.delete(el)
  }
}

/**
 * Ease `el.volume` from its current value to `target` over `durationMs`.
 * Cancels any previous ramp on the same element first.
 */
export function rampVolume(el: HTMLAudioElement, target: number, durationMs = 800): void {
  cancelRamp(el)
  const to = clamp(target)
  const from = clamp(el.volume)
  const delta = to - from
  if (durationMs <= 0 || Math.abs(delta) < 0.001) {
    el.volume = to
    return
  }
  const stepMs = 30
  const steps = Math.max(1, Math.round(durationMs / stepMs))
  let i = 0
  const id = window.setInterval(() => {
    i += 1
    const t = i / steps
    // ease-in-out — gentle at both ends, no audible "edge"
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    el.volume = clamp(from + delta * eased)
    if (i >= steps) {
      el.volume = to
      cancelRamp(el)
    }
  }, stepMs)
  timers.set(el, id)
}

/**
 * Slow breathing animation for the ritual/wind-down screen.
 * A circle expands and contracts on an ~8-second cycle.
 * Pure CSS — no motion libraries, no flashing.
 */

interface Props {
  label?: string
}

export default function BreathingCircle({ label }: Props) {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Outer ring */}
      <div className="relative flex items-center justify-center w-48 h-48">
        {/* Soft background glow */}
        <div
          className="absolute inset-0 rounded-full opacity-20 animate-breathe"
          style={{
            background: 'radial-gradient(circle, rgba(180,200,255,0.6) 0%, transparent 70%)',
            animationDelay: '0.5s',
          }}
        />

        {/* Main breathing circle */}
        <div
          className="absolute inset-4 rounded-full animate-breathe border border-night-400/50"
          style={{
            background:
              'radial-gradient(circle at 40% 35%, rgba(160,180,240,0.35) 0%, rgba(80,100,200,0.15) 60%, transparent 100%)',
          }}
        />

        {/* Inner soft dot */}
        <div
          className="w-10 h-10 rounded-full animate-breathe"
          style={{
            background: 'rgba(200,210,255,0.5)',
            animationDelay: '0.2s',
            animationDuration: '8s',
          }}
        />
      </div>

      {/* Breathing cue text */}
      <div className="text-center text-moon-300 text-lg font-light tracking-wide animate-pulse-soft">
        {label ?? 'Breathe in… and out…'}
      </div>
    </div>
  )
}

/**
 * Full-screen escalation / "Find a grown-up" screen.
 * Shown when SafetyEscalation.triggered is true OR the child presses the help button.
 * Warm, calm, unambiguous — NOT a system alert.
 */
import type { SafetyEscalation } from '../api'

interface Props {
  escalation?: SafetyEscalation | null
  onDismiss?: () => void
}

export default function HelpScreen({ escalation, onDismiss }: Props) {
  const message = escalation?.spoken_response ||
    "Sweetheart, I want to make sure you're safe. Can you go find a grown-up you trust right now — like your mom, dad, or someone close by?"

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 animate-fade-in"
      style={{
        background:
          'radial-gradient(ellipse at 50% 50%, #1a1030 0%, #0d0820 60%, #07051a 100%)',
      }}
    >
      {/* Gentle amber lantern glow at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 opacity-20"
        style={{
          background:
            'radial-gradient(ellipse, rgba(240,168,48,0.7) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Lantern / help icon */}
      <div className="text-7xl mb-6 animate-pulse-soft" aria-hidden="true">🏮</div>

      {/* Warm message */}
      <p className="text-center text-moon-100 text-xl leading-relaxed max-w-md mb-10 font-light">
        {message}
      </p>

      {/* Big "Get a grown-up" button */}
      <button
        type="button"
        className="
          px-10 py-5 rounded-4xl text-xl font-semibold
          bg-glow-amber/20 border-2 border-glow-amber/70 text-glow-amber
          hover:bg-glow-amber/30 active:scale-95
          transition-all duration-400 ease-in-out
          glow-amber
          w-full max-w-xs
        "
        onClick={onDismiss}
      >
        Get a grown-up
      </button>

      {/* Small dismiss / "I'm okay" link */}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 text-sm text-night-400 hover:text-moon-400 transition-colors duration-300"
        >
          I'm okay now
        </button>
      )}
    </div>
  )
}

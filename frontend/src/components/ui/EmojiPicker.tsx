/**
 * EmojiPicker — a friendly grid of child-appropriate avatar emojis.
 * Used in the profile create/edit flow.
 */
interface Props {
  value: string
  onChange: (emoji: string) => void
  label?: string
}

// Warm, gentle, kid-friendly set (animals + nature + cozy things)
export const AVATAR_EMOJIS = [
  '🦊', '🐰', '🐻', '🐨', '🐼', '🦉',
  '🦄', '🐱', '🐶', '🦔', '🐢', '🐧',
  '🌙', '⭐', '🌈', '🌸', '🍀', '🐝',
  '🦋', '🐳', '🦕', '🐙', '🦒', '🐬',
]

export default function EmojiPicker({ value, onChange, label }: Props) {
  return (
    <div>
      {label && (
        <span className="block text-ink-200 text-sm font-semibold mb-2">{label}</span>
      )}
      <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label={label ?? 'Choose an avatar'}>
        {AVATAR_EMOJIS.map(emoji => {
          const selected = value === emoji
          return (
            <button
              key={emoji}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Avatar ${emoji}`}
              onClick={() => onChange(emoji)}
              className={`aspect-square rounded-2xl text-2xl flex items-center justify-center border transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200/60 ${
                selected
                  ? 'border-lavender-400 bg-lavender-100 scale-105 shadow-soft'
                  : 'border-cream-300 bg-cream-50 hover:border-lavender-200 hover:-translate-y-0.5'
              }`}
            >
              {emoji}
            </button>
          )
        })}
      </div>
    </div>
  )
}

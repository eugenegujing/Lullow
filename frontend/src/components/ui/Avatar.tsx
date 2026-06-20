/**
 * Avatar — a soft rounded emoji avatar on a tinted gradient.
 * The tint is derived from the seed so each profile gets a stable colour.
 */
interface Props {
  emoji: string
  size?: number
  /** Stable seed (e.g. child_id or name) used to pick a background tint */
  seed?: string
  ring?: boolean
  className?: string
}

const TINTS = [
  'from-lavender-200 to-lavender-100',
  'from-peach-200 to-peach-100',
  'from-sage-200 to-sage-100',
  'from-lavender-100 to-peach-100',
  'from-peach-100 to-sage-100',
  'from-sage-100 to-lavender-100',
]

function tintFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return TINTS[h % TINTS.length]
}

export default function Avatar({ emoji, size = 64, seed = '', ring = false, className = '' }: Props) {
  const tint = tintFor(seed || emoji)
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${tint} shadow-soft ${
        ring ? 'ring-4 ring-white' : ''
      } ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      {emoji}
    </span>
  )
}

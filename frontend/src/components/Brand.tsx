/**
 * Brand — the Lullow wordmark with a small moon glyph. Light-theme variant.
 */
interface Props {
  size?: 'sm' | 'md' | 'lg'
  tagline?: boolean
}

const SIZES = {
  sm: { text: 'text-xl', glyph: 'text-lg' },
  md: { text: 'text-2xl', glyph: 'text-xl' },
  lg: { text: 'text-4xl sm:text-5xl', glyph: 'text-3xl sm:text-4xl' },
}

export default function Brand({ size = 'md', tagline = false }: Props) {
  const s = SIZES[size]
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2">
        <span className={`${s.glyph}`} aria-hidden="true">🌙</span>
        <span
          className={`font-display font-bold tracking-tight bg-gradient-to-r from-lavender-500 to-peach-400 bg-clip-text text-transparent ${s.text}`}
        >
          Lullow
        </span>
      </div>
      {tagline && (
        <p className="text-ink-100 text-sm sm:text-base mt-2 font-medium">
          a gentle glow for big feelings at bedtime
        </p>
      )}
    </div>
  )
}

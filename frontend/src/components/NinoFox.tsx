/**
 * Nino the fox mascot — a simple CSS/SVG fox silhouette in warm tones.
 * Gentle floating animation. Purely decorative.
 */

interface Props {
  size?: number
  className?: string
}

export default function NinoFox({ size = 80, className = '' }: Props) {
  return (
    <div
      className={`animate-float select-none pointer-events-none ${className}`}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Tail */}
        <ellipse cx="72" cy="78" rx="20" ry="10" fill="#c87530" transform="rotate(-20 72 78)" />
        <ellipse cx="72" cy="78" rx="12" ry="5" fill="#f0c880" transform="rotate(-20 72 78)" />

        {/* Body */}
        <ellipse cx="50" cy="72" rx="22" ry="18" fill="#d08040" />

        {/* Belly */}
        <ellipse cx="50" cy="76" rx="12" ry="10" fill="#f0d090" />

        {/* Head */}
        <circle cx="50" cy="46" r="22" fill="#d08040" />

        {/* Ears */}
        <polygon points="30,28 22,10 40,24" fill="#d08040" />
        <polygon points="70,28 78,10 60,24" fill="#d08040" />
        <polygon points="32,27 26,15 40,25" fill="#e8a060" />
        <polygon points="68,27 74,15 60,25" fill="#e8a060" />

        {/* Face mask */}
        <ellipse cx="50" cy="50" rx="13" ry="10" fill="#f0d090" />

        {/* Eyes — closed/sleepy for bedtime */}
        <path d="M40 43 Q43 40 46 43" stroke="#5c3a1e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M54 43 Q57 40 60 43" stroke="#5c3a1e" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Nose */}
        <ellipse cx="50" cy="51" rx="2.5" ry="1.8" fill="#c05020" />

        {/* Sleepy blush */}
        <ellipse cx="40" cy="52" rx="4" ry="2.5" fill="#e88060" opacity="0.4" />
        <ellipse cx="60" cy="52" rx="4" ry="2.5" fill="#e88060" opacity="0.4" />

        {/* Small smile */}
        <path d="M46 55 Q50 58 54 55" stroke="#c05020" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Paws */}
        <ellipse cx="36" cy="88" rx="9" ry="6" fill="#d08040" />
        <ellipse cx="64" cy="88" rx="9" ry="6" fill="#d08040" />

        {/* Sparkle stars around Nino */}
        <text x="8" y="35" fontSize="8" fill="#f0d070" opacity="0.7" className="animate-twinkle">✦</text>
        <text x="82" y="40" fontSize="6" fill="#f0d070" opacity="0.6" className="animate-twinkle-slow">✦</text>
        <text x="15" y="70" fontSize="5" fill="#c0c0f0" opacity="0.5" className="animate-twinkle-slower">✧</text>
      </svg>
    </div>
  )
}

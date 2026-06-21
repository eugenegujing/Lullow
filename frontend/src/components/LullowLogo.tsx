import { motion } from "motion/react";

interface LullowLogoProps {
  className?: string;
  size?: number | string;
  animated?: boolean;
}

export default function LullowLogo({
  className = "",
  size = 64,
  animated = true
}: LullowLogoProps) {
  // Beautiful responsive golden line-art vector recreation of the Lullow "Light & Lore" brand symbol
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_15px_rgba(251,191,36,0.55)]"
      >
        <defs>
          <linearGradient id="lullowGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffedd5" /> {/* Amber 50 */}
            <stop offset="40%" stopColor="#fcd34d" /> {/* Amber 300 */}
            <stop offset="80%" stopColor="#f59e0b" /> {/* Amber 500 */}
            <stop offset="100%" stopColor="#d97706" /> {/* Amber 600 */}
          </linearGradient>
          <filter id="glowGold">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* 1. Open Book / Lore base */}
        <motion.path
          d="M 20 115
             Q 60 95, 100 112
             Q 140 95, 180 115
             L 170 132
             Q 135 112, 100 128
             Q 65 112, 30 132
             Z"
          stroke="url(#lullowGoldGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glowGold)"
          initial={animated ? { pathLength: 0, opacity: 0 } : undefined}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
        />
        {/* Book spine lower line thickness */}
        <motion.path
          d="M 100 112 L 100 128"
          stroke="url(#lullowGoldGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={animated ? { pathLength: 0 } : undefined}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />

        {/* 2. Cozy Sanctuary Archway */}
        <motion.path
          d="M 75 95
             L 75 60
             A 25 25 0 0 1 125 60
             L 125 95"
          stroke="url(#lullowGoldGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glowGold)"
          initial={animated ? { pathLength: 0, opacity: 0 } : undefined}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.6, delay: 0.3, ease: "easeInOut" }}
        />

        {/* 3. Hanging Sanctuary Bell/Lantern */}
        {/* Hanger line */}
        <motion.path
          d="M 100 35 L 100 45"
          stroke="url(#lullowGoldGradient)"
          strokeWidth="2"
          initial={animated ? { pathLength: 0 } : undefined}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        />
        {/* Bell Outline */}
        <motion.path
          d="M 92 56
             C 91 48, 109 48, 108 56
             Z"
          fill="url(#lullowGoldGradient)"
          stroke="url(#lullowGoldGradient)"
          strokeWidth="1.5"
          filter="url(#glowGold)"
          initial={animated ? { scale: 0, opacity: 0 } : undefined}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2, type: "spring" }}
          style={{ transformOrigin: "100px 48px" }}
        />
        {/* Bell clapper / glowing source */}
        <motion.circle
          cx="100"
          cy="59"
          r="2.5"
          fill="#ffedd5"
          filter="url(#glowGold)"
          animate={animated ? {
            scale: [1, 1.3, 1],
            opacity: [0.8, 1, 0.8]
          } : undefined}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        />

        {/* 4. Beautiful Winding Path of Light rising from book seam to the arch */}
        <motion.path
          d="M 100 112
             C 80 102, 60 92, 90 82
             C 120 72, 130 68, 100 60
             "
          stroke="url(#lullowGoldGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glowGold)"
          initial={animated ? { pathLength: 0, opacity: 0 } : undefined}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, delay: 0.7, ease: "easeOut" }}
        />

        {/* 5. Delicate Bedtime Sparkle / Night Star */}
        <motion.path
          d="M 132 30
             Q 132 38, 140 38
             Q 132 38, 132 46
             Q 132 38, 124 38
             Q 132 38, 132 30
             Z"
          fill="url(#lullowGoldGradient)"
          filter="url(#glowGold)"
          initial={animated ? { scale: 0, opacity: 0, rotate: -45 } : undefined}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 1.2, delay: 1.5, type: "spring" }}
          style={{ transformOrigin: "132px 38px" }}
        />
      </svg>
    </div>
  );
}

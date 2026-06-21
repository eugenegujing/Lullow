import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

export type ThemeType = 'silverwood' | 'deep_indigo' | 'andromeda' | 'lotus_garden';

export const THEME_COLOR_MAP: Record<ThemeType, {
  firstColor: string;
  secondColor: string;
  thirdColor: string;
  fourthColor: string;
  fifthColor: string;
  pointerColor: string;
}> = {
  silverwood: {
    firstColor: "251, 191, 36", // Warm Amber
    secondColor: "99, 102, 241", // Cozy Indigo
    thirdColor: "168, 85, 247",  // Velvet Purple
    fourthColor: "239, 68, 68",   // Soft Rose Core
    fifthColor: "20, 184, 166",   // Celestial Teal
    pointerColor: "251, 191, 36",
  },
  deep_indigo: {
    firstColor: "14, 116, 144",  // Deep Cyan / Teal
    secondColor: "30, 58, 138",   // Royal Blue
    thirdColor: "79, 70, 229",   // Vibrant Indigo
    fourthColor: "13, 148, 136",  // Strong Teal Core
    fifthColor: "6, 182, 212",    // Sky Cyan
    pointerColor: "6, 182, 212",
  },
  andromeda: {
    firstColor: "219, 39, 119",  // Sweet Magenta
    secondColor: "124, 58, 237", // Space Violet
    thirdColor: "249, 115, 22",   // Radiant Sunset Orange
    fourthColor: "225, 29, 72",   // Red Nebula
    fifthColor: "139, 92, 246",  // Cosmic Purple
    pointerColor: "124, 58, 237",
  },
  lotus_garden: {
    firstColor: "16, 185, 129",   // Emerald Green
    secondColor: "244, 63, 94",   // Soft Lotus Petal Pink
    thirdColor: "234, 179, 8",    // Warm Imperial Gold
    fourthColor: "5, 150, 105",   // Moss Jade
    fifthColor: "244, 63, 94",    // Lotus Blossom Pink
    pointerColor: "234, 179, 8",
  },
};

interface BackgroundGradientAnimationProps {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  theme?: ThemeType;
  firstColor?: string;
  secondColor?: string;
  thirdColor?: string;
  fourthColor?: string;
  fifthColor?: string;
  pointerColor?: string;
  size?: string;
  blendingValue?: string;
}

export default function BackgroundGradientAnimation({
  children,
  className,
  containerClassName,
  theme = 'silverwood',
  firstColor,
  secondColor,
  thirdColor,
  fourthColor,
  fifthColor,
  pointerColor,
  size = "60%",
}: BackgroundGradientAnimationProps) {
  const [interactivePosition, setInteractivePosition] = useState({ x: 0, y: 0 });
  const [isSafari, setIsSafari] = useState(false);

  // Initialize liquid glass drops falling down
  const [liquidDrops] = useState(() =>
    Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      left: Math.random() * 95 + 2.5,        // percentage across screen
      duration: 6 + Math.random() * 8,       // slow soothing fall rates
      delay: Math.random() * 10,             // staggered start
      width: 1.5 + Math.random() * 2.0,      // thin glassy drips
      height: 40 + Math.random() * 70,       // stretched droplet bodies
      opacity: 0.12 + Math.random() * 0.20,  // subtle glare
    }))
  );

  // Resolve values from map or use overrides
  const resolvedColors = THEME_COLOR_MAP[theme] || THEME_COLOR_MAP.silverwood;
  const fColor = firstColor || resolvedColors.firstColor;
  const sColor = secondColor || resolvedColors.secondColor;
  const tColor = thirdColor || resolvedColors.thirdColor;
  const foColor = fourthColor || resolvedColors.fourthColor;
  const fiColor = fifthColor || resolvedColors.fifthColor;
  const pColor = pointerColor || resolvedColors.pointerColor;

  useEffect(() => {
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setInteractivePosition({
        x: event.clientX,
        y: event.clientY,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-black/40 ${containerClassName || ""}`}
    >
      {/* SVG filter matrix to make the blur nodes blend into organic liquid shapes */}
      <svg className="hidden">
        <defs>
          <filter id="liquid-blend">
            <feGaussianBlur in="SourceGraphic" stdDeviation="50" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11"
              result="liquid-blend"
            />
            <feBlend in="SourceGraphic" in2="liquid-blend" />
          </filter>
        </defs>
      </svg>

      {/* Interactive gradient blobs */}
      <div
        className="absolute inset-0 filter blur-[80px] sm:blur-[110px] opacity-45 sm:opacity-55 mix-blend-screen pointer-events-none"
        style={{ filter: isSafari ? "blur(70px)" : "url(#liquid-blend)" }}
      >
        {/* Blob 1 */}
        <motion.div
          animate={{
            x: [0, 80, -60, 0],
            y: [0, -90, 80, 0],
            scale: [1, 1.25, 0.85, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, rgba(${fColor}, 0.65) 0%, rgba(${fColor}, 0) 65%)`,
            width: size,
            height: size,
            top: "15%",
            left: "20%",
            transformOrigin: "center center",
          }}
        />

        {/* Blob 2 */}
        <motion.div
          animate={{
            x: [0, -100, 70, 0],
            y: [0, 80, -90, 0],
            scale: [1, 0.8, 1.2, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, rgba(${sColor}, 0.5) 0%, rgba(${sColor}, 0) 60%)`,
            width: size,
            height: size,
            top: "30%",
            left: "10%",
            transformOrigin: "center center",
          }}
        />

        {/* Blob 3 */}
        <motion.div
          animate={{
            x: [0, 90, -70, 0],
            y: [0, 60, -100, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, rgba(${tColor}, 0.45) 0%, rgba(${tColor}, 0) 70%)`,
            width: `calc(${size} * 0.9)`,
            height: `calc(${size} * 0.9)`,
            bottom: "20%",
            right: "15%",
            transformOrigin: "center center",
          }}
        />

        {/* Blob 4 */}
        <motion.div
          animate={{
            x: [0, -60, 80, 0],
            y: [0, -80, 70, 0],
            scale: [1, 0.9, 1.15, 1],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, rgba(${foColor}, 0.4) 0%, rgba(${foColor}, 0) 60%)`,
            width: `calc(${size} * 0.85)`,
            height: `calc(${size} * 0.85)`,
            top: "40%",
            right: "25%",
            transformOrigin: "center center",
          }}
        />

        {/* Blob 5 */}
        <motion.div
          animate={{
            x: [0, 50, -50, 0],
            y: [0, 100, -80, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, rgba(${fiColor}, 0.35) 0%, rgba(${fiColor}, 0) 65%)`,
            width: size,
            height: size,
            bottom: "10%",
            left: "30%",
          }}
        />

        {/* Interactive Pointer Follower Blob */}
        <motion.div
          animate={{
            x: interactivePosition.x - window.innerWidth / 2,
            y: interactivePosition.y - window.innerHeight / 2,
          }}
          transition={{
            type: "spring",
            damping: 35,
            stiffness: 45,
            mass: 0.8
          }}
          className="absolute rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, rgba(${pColor}, 0.3) 0%, rgba(${pColor}, 0) 50%)`,
            width: "350px",
            height: "350px",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>

      {/* Gravity-Driven Liquid Glass Droplet Rain overlay -> actual "liquid glass drop down motion" */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {liquidDrops.map((drop) => {
          // Dynamic color hue to match active theme accents
          const accentColors: Record<ThemeType, string> = {
            silverwood: 'rgba(251, 191, 36, 0.25)', // Amber sheen
            deep_indigo: 'rgba(6, 182, 212, 0.25)', // Cyan sheen
            andromeda: 'rgba(219, 39, 119, 0.25)',  // Magenta sheen
            lotus_garden: 'rgba(16, 185, 129, 0.25)', // Emerald sheen
          };
          const dropletGlareColor = accentColors[theme] || 'rgba(255, 255, 255, 0.25)';

          return (
            <motion.div
              key={`liquid-drop-${drop.id}`}
              initial={{ y: "-15vh", scaleY: 0.6 }}
              animate={{
                y: "115vh",
                // Stretches while dropping, snaps, and re-rounds at extreme bounds
                scaleY: [0.6, 1.4, 1.5, 0.9, 0.6]
              }}
              transition={{
                duration: drop.duration,
                repeat: Infinity,
                delay: drop.delay,
                ease: "linear",
              }}
              className="absolute rounded-full backdrop-blur-[2px] transition-colors duration-500"
              style={{
                left: `${drop.left}%`,
                width: `${drop.width}px`,
                height: `${drop.height}px`,
                opacity: drop.opacity,
                background: `linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, ${dropletGlareColor} 30%, rgba(255, 255, 255, 0) 100%)`,
                boxShadow: `inset 1px 0 1px rgba(255, 255, 255, 0.3), 0 0 4px ${dropletGlareColor}`,
              }}
            />
          );
        })}
      </div>

      <div className={className}>{children}</div>
    </div>
  );
}

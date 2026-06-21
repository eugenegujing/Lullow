import { motion } from "motion/react";

interface LullowBorderBeamProps {
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  colorMid?: string;
  borderWidth?: number;
  glowOpacity?: number;
  className?: string;
  enableOuterGlow?: boolean;
}

export default function LullowBorderBeam({
  duration = 6,
  colorFrom = "#fbbf24", // Vibrant amber gold
  colorTo = "#d97706",   // Warm bronze amber
  colorMid = "#6366f1",  // Cosmic indigo violet
  borderWidth = 1.5,
  glowOpacity = 0.8,
  className = "",
  enableOuterGlow = false,
}: LullowBorderBeamProps) {
  return (
    <>
      {/* 1. Synced Ambient Outer Glow (Soft blur blooming outward) */}
      {enableOuterGlow && (
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] -z-10 mix-blend-screen opacity-40 filter blur-md">
          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute"
            style={{
              width: "160%",
              height: "160%",
              top: "-30%",
              left: "-30%",
              transformOrigin: "center center",
              background: `conic-gradient(from 0deg, transparent 40%, ${colorMid} 65%, ${colorFrom} 85%, ${colorTo} 100%)`,
            }}
          />
        </div>
      )}

      {/* 2. Razor-Sharp Masked Border Beam (Sweeps precisely along the border line) */}
      <div
        className={`absolute inset-0 pointer-events-none rounded-[inherit] ${className}`}
        style={{
          padding: `${borderWidth}px`,
          maskImage: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          maskComposite: "exclude",
          WebkitMaskImage: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          WebkitMaskComposite: "destination-out",
        }}
      >
        <motion.div
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute"
          style={{
            width: "180%",
            height: "180%",
            top: "-40%",
            left: "-40%",
            transformOrigin: "center center",
            background: `conic-gradient(from 0deg, transparent 40%, ${colorMid} 65%, ${colorFrom} 85%, ${colorTo} 100%)`,
            opacity: glowOpacity,
          }}
        />
      </div>
    </>
  );
}

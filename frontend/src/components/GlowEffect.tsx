import React from "react";
import { motion } from "motion/react";

interface GlowEffectProps {
  colors?: string[];
  mode?: "static" | "pulse" | "breathe" | "rotate";
  blur?: "low" | "medium" | "high" | "heavenly";
  className?: string;
  energy?: number; // Optional sound/energy value to dynamically shift intensity
}

export default function GlowEffect({
  colors = ["#FBBF24", "#F59E0B", "#F97316", "#EF4444"], // Ambers, Sunset Oranges and Soft Fire Core
  mode = "breathe",
  blur = "heavenly",
  className = "",
  energy = 0.2,
}: GlowEffectProps) {
  const blurClasses = {
    low: "blur-md",
    medium: "blur-xl",
    high: "blur-2xl sm:blur-3xl",
    heavenly: "blur-[60px] sm:blur-[100px]",
  };

  // Compute animations based on mode
  const getAnimationProps = () => {
    switch (mode) {
      case "pulse":
        return {
          scale: [1, 1.1 + energy * 0.15, 1],
          opacity: [0.5, 0.85 + energy * 0.15, 0.5],
          transition: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
      case "rotate":
        return {
          rotate: [0, 360],
          scale: [1, 1.08, 0.95, 1],
          transition: {
            rotate: {
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            },
            scale: {
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            },
          },
        };
      case "breathe":
      default:
        return {
          scale: [0.95, 1.05 + energy * 0.12, 0.95],
          opacity: [0.4, 0.75 + energy * 0.2, 0.4],
          transition: {
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
    }
  };

  return (
    <div className={`absolute inset-x-0 -inset-y-4 pointer-events-none -z-10 ${className}`}>
      <motion.div
        animate={getAnimationProps() as any}
        className={`absolute inset-0 w-full h-full rounded-3xl opacity-60 mix-blend-screen transition-all duration-500 ${blurClasses[blur]}`}
        style={{
          background: `radial-gradient(circle at center, ${colors[0]} 0%, ${colors[1] || colors[0]} 25%, ${colors[2] || colors[0]} 55%, ${colors[3] || "transparent"} 80%, transparent 100%)`,
        }}
      />
    </div>
  );
}

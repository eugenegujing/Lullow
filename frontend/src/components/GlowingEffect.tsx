import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

interface GlowingEffectProps {
  spread?: number;
  glow?: boolean;
  disabled?: boolean;
  proximity?: number;
  inactiveZone?: number;
  className?: string;
  glowColor?: string; // e.g. "rgba(251, 191, 36, 0.3)" (gold)
}

export default function GlowingEffect({
  spread = 40,
  glow = true,
  disabled = false,
  proximity = 64,
  inactiveZone = 0.01,
  className = "",
  glowColor = "rgba(251, 191, 36, 0.25)"
}: GlowingEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Use MotionValues for physics-backed, 60fps responsive spring interactions
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 300, damping: 24, mass: 0.2 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 24, mass: 0.2 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseX.set(x);
      mouseY.set(y);
    };

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [disabled, mouseX, mouseY]);

  if (disabled) return null;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full pointer-events-none rounded-inherit ${className}`}
    >
      {/* Glow path border track */}
      <motion.div
        className="absolute inset-[0.5px] rounded-inherit border border-transparent"
        style={{
          background: useTransform(
            [springX, springY],
            ([x, y]) => `radial-gradient(${proximity}px circle at ${x}px ${y}px, ${glowColor} 0%, transparent 100%)`
          ),
          opacity: isHovered ? 1 : inactiveZone,
          transition: "opacity 0.4s ease-in-out",
          WebkitMaskImage: "linear-gradient(#fff, #fff)", // clip inside edges
          maskImage: "linear-gradient(#fff, #fff)"
        }}
      />
      {/* Background shadow glow */}
      {glow && (
        <motion.div
          className="absolute inset-0 rounded-inherit filter blur-md -z-10"
          style={{
            background: useTransform(
              [springX, springY],
              ([x, y]) => `radial-gradient(${spread}px circle at ${x}px ${y}px, ${glowColor} 0%, transparent 80%)`
            ),
            opacity: isHovered ? 0.75 : 0,
            transition: "opacity 0.3s ease"
          }}
        />
      )}
    </div>
  );
}

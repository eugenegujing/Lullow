/**
 * Full-screen night sky background with a glowing moon, drifting stars,
 * and a soft gradient. Purely CSS/SVG — no flashing, low-stimulation.
 */
import { useMemo } from 'react'

interface Star {
  cx: number
  cy: number
  r: number
  anim: 'animate-twinkle' | 'animate-twinkle-slow' | 'animate-twinkle-slower'
  delay: string
}

function useStars(count: number): Star[] {
  return useMemo(() => {
    // Deterministic-ish distribution so it looks natural
    const anims: Star['anim'][] = ['animate-twinkle', 'animate-twinkle-slow', 'animate-twinkle-slower']
    return Array.from({ length: count }, (_, i) => ({
      cx:    ((i * 137 + 23) % 100),
      cy:    ((i * 89  + 11) % 55),   // top 55% of screen
      r:     0.3 + (i % 4) * 0.15,
      anim:  anims[i % 3],
      delay: `${(i * 0.37) % 4}s`,
    }))
  }, [count])
}

export default function NightSky() {
  const stars = useStars(55)

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none">
      {/* Deep indigo/navy gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, #1a1f4a 0%, #0d1240 35%, #07091e 70%, #05060f 100%)',
        }}
      />

      {/* Subtle warm horizon glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-64"
        style={{
          background:
            'linear-gradient(to top, rgba(60,30,15,0.35) 0%, transparent 100%)',
        }}
      />

      {/* Stars */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="#e8e4f8"
            className={s.anim}
            style={{ animationDelay: s.delay }}
          />
        ))}
      </svg>

      {/* Soft glowing moon */}
      <div
        className="absolute top-[8%] left-[50%] -translate-x-1/2 animate-float"
        aria-hidden="true"
      >
        {/* Outer glow rings */}
        <div
          className="absolute -inset-8 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(220,220,255,0.08) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute -inset-4 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(220,220,255,0.12) 0%, transparent 70%)',
          }}
        />
        {/* Moon surface */}
        <div
          className="w-24 h-24 rounded-full relative"
          style={{
            background:
              'radial-gradient(ellipse at 40% 35%, #f5f0d0 0%, #ddd8b0 40%, #c0ba90 80%, #a8a270 100%)',
            boxShadow: '0 0 30px rgba(200,200,180,0.4), 0 0 80px rgba(180,180,160,0.15)',
          }}
        >
          {/* Subtle craters */}
          <div
            className="absolute top-5 left-8 w-4 h-4 rounded-full opacity-20"
            style={{ background: 'rgba(100,90,60,0.4)' }}
          />
          <div
            className="absolute top-12 left-5 w-2 h-2 rounded-full opacity-15"
            style={{ background: 'rgba(100,90,60,0.4)' }}
          />
        </div>
      </div>

      {/* Soft cloud wisps */}
      {[
        { top: '65%', left: '-5%',  w: 200, opacity: 0.06 },
        { top: '72%', left: '60%',  w: 160, opacity: 0.05 },
        { top: '55%', left: '25%',  w: 120, opacity: 0.04 },
      ].map((c, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: c.top,
            left: c.left,
            width: c.w,
            height: c.w * 0.35,
            background: `rgba(180,170,220,${c.opacity})`,
            filter: 'blur(18px)',
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

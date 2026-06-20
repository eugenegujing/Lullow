/**
 * WarmBackground — the soft, airy backdrop for the light "soft modern" theme
 * (profile picker, onboarding, child home/check-in, parent dashboard).
 * Layered pastel radial blobs over a warm cream base. No motion, no flashing.
 */
export default function WarmBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      <div className="absolute inset-0 gradient-warm" />

      {/* Soft floating colour blobs for depth */}
      <div
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.5) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full opacity-35 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(251,180,140,0.45) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-32 left-1/4 w-[30rem] h-[30rem] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(159,194,152,0.4) 0%, transparent 70%)' }}
      />
    </div>
  )
}

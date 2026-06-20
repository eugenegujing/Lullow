/**
 * Small floating badge showing live vs. mock status of each sponsor integration.
 * Unobtrusive — bottom-right corner, warm dark background, small text.
 */
import { useEffect, useState } from 'react'
import { getStatus } from '../api'
import type { FeatureStatus } from '../api'

const LABELS: Record<keyof FeatureStatus, string> = {
  anthropic: 'Claude',
  deepgram:  'Deepgram',
  redis:     'Redis',
  pika:      'Pika',
  image:     'Image',
  arize:     'Arize',
  terac:     'Terac',
}

export default function StatusBadge() {
  const [features, setFeatures] = useState<FeatureStatus | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    getStatus()
      .then(s => setFeatures(s.features))
      .catch(() => {/* backend may not be up yet */})
  }, [])

  if (!features) return null

  const liveCount = Object.values(features).filter(Boolean).length
  const total     = Object.values(features).length

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="bg-night-900/90 border border-night-700 rounded-2xl p-3 text-xs backdrop-blur-sm animate-fade-in">
          <div className="mb-1 text-moon-300 font-semibold text-center">Integration status</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {(Object.entries(LABELS) as [keyof FeatureStatus, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${features[key] ? 'bg-green-400' : 'bg-yellow-600'}`} />
                <span className="text-moon-200">{label}</span>
                <span className={`ml-auto text-[10px] ${features[key] ? 'text-green-400' : 'text-yellow-600'}`}>
                  {features[key] ? 'live' : 'mock'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-night-900/80 border border-night-700 rounded-full px-3 py-1 text-xs text-moon-300 backdrop-blur-sm hover:border-glow-amber/50 transition-colors duration-300"
        aria-label="Toggle integration status"
      >
        {liveCount}/{total} live
      </button>
    </div>
  )
}

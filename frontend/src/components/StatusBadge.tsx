/**
 * Small floating badge showing live vs. mock status of each sponsor integration.
 * Unobtrusive — bottom-right corner. Frosted light card that reads on both the
 * warm light theme and (faintly) the dark story flow.
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
        <div className="bg-cream-50/95 border border-cream-300 rounded-2xl p-3 text-xs backdrop-blur-md shadow-soft-lg animate-pop-in">
          <div className="mb-2 text-ink-300 font-semibold text-center font-display">
            Integration status
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
            {(Object.entries(LABELS) as [keyof FeatureStatus, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${features[key] ? 'bg-sage-400' : 'bg-peach-300'}`} />
                <span className="text-ink-300">{label}</span>
                <span className={`ml-auto text-[10px] font-medium ${features[key] ? 'text-sage-500' : 'text-peach-400'}`}>
                  {features[key] ? 'live' : 'mock'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-cream-50/90 border border-cream-300 rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-300 backdrop-blur-md shadow-soft hover:border-lavender-300 hover:shadow-soft-md transition-all duration-200"
        aria-label="Toggle integration status"
        aria-expanded={open}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-400 mr-1.5 align-middle" />
        {liveCount}/{total} live
      </button>
    </div>
  )
}

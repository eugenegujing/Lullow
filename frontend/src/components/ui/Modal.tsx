/**
 * Modal — a centered dialog for the light theme.
 * Closes on backdrop click and Escape. Locks body scroll while open.
 * Accessible: role="dialog", aria-modal, labelled by its title.
 */
import { useEffect, useId } from 'react'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Footer action row, e.g. Cancel / Confirm buttons */
  footer?: ReactNode
  maxWidth?: string
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-md',
}: Props) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in-fast"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink-500/30 backdrop-blur-sm" aria-hidden="true" />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={e => e.stopPropagation()}
        className={`relative w-full ${maxWidth} bg-cream-50 border border-cream-300 rounded-3xl shadow-soft-lg animate-pop-in`}
      >
        <div className="p-6">
          {title && (
            <h2 id={titleId} className="font-display text-xl font-bold text-ink-400 mb-4">
              {title}
            </h2>
          )}
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-cream-300">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

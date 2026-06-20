/**
 * Toggle — an accessible switch for the light theme.
 * Renders as a real checkbox (sr-only) so it's keyboard + screen-reader friendly.
 */
import { useId } from 'react'

interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}

export default function Toggle({ checked, onChange, label, description }: Props) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer select-none group">
      <span className="relative inline-flex shrink-0 mt-0.5">
        <input
          id={id}
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <span
          className={`block w-11 h-6 rounded-full transition-colors duration-200 peer-focus-visible:ring-4 peer-focus-visible:ring-lavender-200/60 ${
            checked ? 'bg-lavender-400' : 'bg-cream-400'
          }`}
        />
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition-transform duration-200 ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-ink-300 text-sm font-medium leading-snug">{label}</span>
        {description && (
          <span className="block text-ink-50 text-xs mt-0.5 leading-relaxed">{description}</span>
        )}
      </span>
    </label>
  )
}

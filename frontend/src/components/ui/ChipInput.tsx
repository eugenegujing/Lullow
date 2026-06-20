/**
 * ChipInput — a tag / chip input for list fields (favorite animals, blocked
 * topics, traits…). Adds on Enter or the + button; removes via the chip's ✕.
 */
import { useId, useState } from 'react'

interface Props {
  label?: string
  hint?: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  /** Optional accent for the chips (default lavender) */
  tone?: 'lavender' | 'peach' | 'sage'
}

const TONES = {
  lavender: 'bg-lavender-100 border-lavender-200 text-lavender-700',
  peach: 'bg-peach-100 border-peach-200 text-peach-500',
  sage: 'bg-sage-100 border-sage-200 text-sage-500',
}

export default function ChipInput({
  label,
  hint,
  values,
  onChange,
  placeholder = 'Add…',
  tone = 'lavender',
}: Props) {
  const id = useId()
  const [draft, setDraft] = useState('')

  const commit = () => {
    const v = draft.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft('')
  }

  const remove = (i: number) => onChange(values.filter((_, j) => j !== i))

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-ink-200 text-sm font-semibold mb-1.5">
          {label}
        </label>
      )}

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {values.map((t, i) => (
            <span
              key={`${t}-${i}`}
              className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full border text-sm font-medium animate-pop-in ${TONES[tone]}`}
            >
              {t}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${t}`}
                className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
              >
                <span aria-hidden="true" className="text-xs">✕</span>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          id={id}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-2xl bg-cream-50 border border-cream-300 text-ink-400 placeholder-ink-50 px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:border-lavender-400 focus:ring-4 focus:ring-lavender-200/50 focus:bg-white"
        />
        <button
          type="button"
          onClick={commit}
          disabled={!draft.trim()}
          className="shrink-0 px-4 py-2.5 rounded-2xl bg-lavender-100 border border-lavender-200 text-lavender-700 text-sm font-semibold hover:bg-lavender-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        >
          + Add
        </button>
      </div>

      {hint && <p className="text-ink-50 text-xs mt-1.5">{hint}</p>}
    </div>
  )
}

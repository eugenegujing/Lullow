/**
 * Slider — a labelled range input for the light theme (story length, etc.).
 * Shows the current value as a soft pill on the right.
 */
import { useId } from 'react'

interface Props {
  label?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

export default function Slider({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  unit = '',
}: Props) {
  const id = useId()
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label htmlFor={id} className="text-ink-200 text-sm font-semibold">
            {label}
          </label>
          <span className="text-lavender-700 text-sm font-semibold bg-lavender-100 border border-lavender-200 rounded-full px-3 py-0.5">
            {value}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="lullow-range w-full h-2 rounded-full appearance-none cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200/60"
        style={{
          background: `linear-gradient(to right, #A78BFA 0%, #A78BFA ${pct}%, #E9E2D5 ${pct}%, #E9E2D5 100%)`,
        }}
      />
      {/* Slider thumb styling (scoped via class) */}
      <style>{`
        .lullow-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: #fff;
          border: 3px solid #8B7CF6;
          box-shadow: 0 2px 6px rgba(46,42,57,0.18);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .lullow-range::-webkit-slider-thumb:hover { transform: scale(1.12); }
        .lullow-range::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: #fff;
          border: 3px solid #8B7CF6;
          box-shadow: 0 2px 6px rgba(46,42,57,0.18);
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}

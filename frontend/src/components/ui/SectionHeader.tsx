/**
 * SectionHeader — a small eyebrow + title + optional description used to
 * head form sections and dashboard panels on the light theme.
 */
import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  eyebrow?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export default function SectionHeader({
  title,
  description,
  eyebrow,
  icon,
  action,
  className = '',
}: Props) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-lavender-500 text-xs font-semibold uppercase tracking-[0.18em] mb-1.5">
            {eyebrow}
          </p>
        )}
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink-400">
          {icon && <span aria-hidden="true">{icon}</span>}
          {title}
        </h2>
        {description && (
          <p className="text-ink-100 text-sm mt-1.5 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

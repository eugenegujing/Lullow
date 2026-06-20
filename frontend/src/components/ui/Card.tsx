/**
 * Card — a rounded, soft-shadowed surface for the light theme.
 * `interactive` adds a gentle hover lift (for clickable cards).
 */
import type { HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  padded?: boolean
  children: ReactNode
}

export default function Card({
  interactive = false,
  padded = true,
  children,
  className = '',
  ...rest
}: Props) {
  return (
    <div
      {...rest}
      className={`
        bg-cream-50 border border-cream-300 rounded-3xl shadow-soft
        ${padded ? 'p-6' : ''}
        ${interactive
          ? 'transition-all duration-200 ease-out cursor-pointer hover:-translate-y-1 hover:shadow-soft-lg hover:border-lavender-200'
          : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

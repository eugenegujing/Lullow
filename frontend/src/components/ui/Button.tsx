/**
 * Button — the one button used across the light "soft modern" theme.
 * Variants: primary (lavender), secondary (cream), ghost, soft (tinted),
 * danger. Sizes: sm | md | lg. Rounded, soft-shadow, gentle hover lift.
 *
 * Tap targets are >= 44px at md/lg for accessibility.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  leftIcon?: ReactNode
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'gradient-lavender text-white shadow-soft-md hover:shadow-lift hover:-translate-y-0.5 active:translate-y-0',
  secondary:
    'bg-cream-50 text-ink-400 border border-cream-300 shadow-soft hover:border-lavender-300 hover:-translate-y-0.5 hover:shadow-soft-md active:translate-y-0',
  soft:
    'bg-lavender-100 text-lavender-700 border border-lavender-200 hover:bg-lavender-200 hover:-translate-y-0.5 active:translate-y-0',
  ghost:
    'bg-transparent text-ink-200 hover:bg-cream-200 hover:text-ink-400',
  danger:
    'bg-peach-100 text-peach-500 border border-peach-200 hover:bg-peach-200 active:translate-y-0',
}

const SIZES: Record<Size, string> = {
  sm: 'text-sm px-4 py-2 rounded-xl gap-1.5 min-h-[36px]',
  md: 'text-base px-6 py-3 rounded-2xl gap-2 min-h-[48px]',
  lg: 'text-lg px-8 py-4 rounded-2xl gap-2.5 min-h-[56px]',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  children,
  className = '',
  disabled,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center font-display font-semibold
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-4 focus-visible:ring-lavender-300/50
        disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-soft
        ${VARIANTS[variant]}
        ${SIZES[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
      {children}
    </button>
  )
}

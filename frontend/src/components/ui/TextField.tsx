/**
 * TextField — labelled input / textarea for the light theme.
 * Handles label, optional hint, and error message with proper aria wiring.
 */
import { useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

interface BaseProps {
  label?: string
  hint?: string
  error?: string
  trailing?: ReactNode
  containerClassName?: string
  className?: string
}

type InputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
    as?: 'input'
  }

type TextAreaProps = BaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
    as: 'textarea'
  }

type Props = InputProps | TextAreaProps

const FIELD_BASE =
  'w-full rounded-2xl bg-cream-50 border text-ink-400 placeholder-ink-50 ' +
  'px-4 py-3 text-base leading-relaxed transition-all duration-200 ' +
  'focus:outline-none focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed'

export default function TextField(props: Props) {
  const reactId = useId()
  const id = props.id ?? reactId
  const describedBy = props.error ? `${id}-error` : props.hint ? `${id}-hint` : undefined

  const borderState = props.error
    ? 'border-peach-300 focus:border-peach-400 focus:ring-4 focus:ring-peach-100'
    : 'border-cream-300 focus:border-lavender-400 focus:ring-4 focus:ring-lavender-200/50'

  let control: ReactNode
  if (props.as === 'textarea') {
    const { label: _l, hint: _h, error: _e, trailing: _t, containerClassName: _c, className = '', as: _as, ...rest } =
      props
    void _l; void _h; void _e; void _t; void _c; void _as
    control = (
      <textarea
        {...rest}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={!!props.error}
        className={`${FIELD_BASE} ${borderState} resize-none ${className}`}
      />
    )
  } else {
    const { label: _l, hint: _h, error: _e, trailing, containerClassName: _c, className = '', as: _as, ...rest } =
      props
    void _l; void _h; void _e; void _c; void _as
    control = (
      <div className="relative">
        <input
          {...rest}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={!!props.error}
          className={`${FIELD_BASE} ${borderState} ${trailing ? 'pr-12' : ''} ${className}`}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-3 flex items-center text-ink-50">{trailing}</div>
        )}
      </div>
    )
  }

  return (
    <div className={props.containerClassName}>
      {props.label && (
        <label htmlFor={id} className="block text-ink-200 text-sm font-semibold mb-1.5">
          {props.label}
        </label>
      )}
      {control}
      {props.error ? (
        <p id={`${id}-error`} className="text-peach-500 text-xs mt-1.5 font-medium">
          {props.error}
        </p>
      ) : props.hint ? (
        <p id={`${id}-hint`} className="text-ink-50 text-xs mt-1.5">
          {props.hint}
        </p>
      ) : null}
    </div>
  )
}

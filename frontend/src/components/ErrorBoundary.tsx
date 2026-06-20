/**
 * ErrorBoundary — catches render-time errors in the child tree.
 * Falls back to a calm dark screen that matches the bedtime aesthetic
 * (deep indigo, no bright white, no alarming language).
 */
import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log for debugging without crashing further
    console.error('[Lullow] Render error caught by ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-6 px-8 text-center"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, #1a1530 0%, #0e0e20 50%, #07091e 100%)',
          }}
        >
          {/* Gentle moon icon instead of an error symbol */}
          <div className="text-6xl" aria-hidden="true">🌙</div>

          <p className="text-moon-300 text-xl font-light leading-relaxed max-w-sm">
            Something went a bit sideways. Let's start fresh.
          </p>

          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false })
              window.location.href = '/'
            }}
            className="
              px-8 py-3 rounded-3xl
              bg-night-800/60 border border-night-600/60
              text-moon-200 font-light
              hover:border-glow-amber/50 hover:text-moon-100
              transition-all duration-500
            "
          >
            Go back home
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

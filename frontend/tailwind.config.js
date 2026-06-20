/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Body text + UI
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Soft rounded display for headings / brand
        display: ['Quicksand', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        // ----------------------------------------------------------------- //
        // SOFT MODERN (light + warm) — the daytime / parent / picker theme
        // ----------------------------------------------------------------- //
        // Warm cream/off-white base surfaces
        cream: {
          50:  '#FFFDF9',  // lightest card surface
          100: '#FAF7F2',  // app background
          200: '#F3EEE5',  // subtle panel
          300: '#E9E2D5',  // borders / dividers
          400: '#D8CDBA',
        },
        // Soft lavender — primary brand
        lavender: {
          50:  '#F4F1FE',
          100: '#EAE5FC',
          200: '#D8CEFA',
          300: '#C2B3F6',
          400: '#A78BFA',  // primary
          500: '#8B7CF6',  // primary deep
          600: '#7A66E8',
          700: '#6750C9',
        },
        // Warm peach / amber accent
        peach: {
          50:  '#FFF4EE',
          100: '#FFE6D8',
          200: '#FFD0B5',
          300: '#FBB48C',
          400: '#F49A6B',
          500: '#E8825A',
        },
        // Soft sage accent
        sage: {
          50:  '#F0F5EF',
          100: '#DEEBDB',
          200: '#C2DABD',
          300: '#9FC298',
          400: '#7FA877',
          500: '#618A59',
        },
        // Muted ink for text on light surfaces
        ink: {
          50:  '#8B8595',
          100: '#6E6878',
          200: '#544E60',
          300: '#3E3949',
          400: '#2E2A39',  // primary text
          500: '#211E2B',
        },

        // ----------------------------------------------------------------- //
        // MOONLIT (dark) — the child STORY experience (bedtime safety)
        // ----------------------------------------------------------------- //
        moon: {
          50:  '#f5f0e8',
          100: '#ede4d0',
          200: '#d9c9a8',
          300: '#c4ae84',
          400: '#b09462',
          500: '#977a46',
          600: '#7a6138',
          700: '#5e4a2c',
          800: '#43341f',
          900: '#281f12',
        },
        night: {
          50:  '#e8eaf4',
          100: '#c5cae8',
          200: '#9fa8d8',
          300: '#7886c8',
          400: '#5468bb',
          500: '#3349ae',
          600: '#2d3f9e',
          700: '#25338a',
          800: '#1c2675',
          900: '#0d1340',
          950: '#07091e',
        },
        glow: {
          amber:  '#f0a830',
          peach:  '#e88060',
          cream:  '#f8f0dc',
          indigo: '#8898cc',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        // Soft layered shadows for the light theme — never harsh
        'soft':    '0 2px 8px -2px rgba(46,42,57,0.08), 0 4px 16px -4px rgba(46,42,57,0.06)',
        'soft-md': '0 4px 16px -4px rgba(46,42,57,0.10), 0 8px 32px -8px rgba(46,42,57,0.08)',
        'soft-lg': '0 8px 28px -8px rgba(46,42,57,0.12), 0 16px 48px -12px rgba(46,42,57,0.10)',
        'lift':    '0 12px 32px -8px rgba(123,102,232,0.18), 0 20px 56px -16px rgba(46,42,57,0.12)',
        'glow-lavender': '0 0 0 4px rgba(167,139,250,0.18)',
      },
      animation: {
        'twinkle':        'twinkle 3s ease-in-out infinite',
        'twinkle-slow':   'twinkle 5s ease-in-out infinite',
        'twinkle-slower': 'twinkle 7s ease-in-out infinite',
        'breathe':        'breathe 8s ease-in-out infinite',
        'float':          'float 6s ease-in-out infinite',
        'pulse-soft':     'pulseSoft 4s ease-in-out infinite',
        'fade-in':        'fadeIn 0.6s ease-out',
        'fade-in-fast':   'fadeIn 0.3s ease-out',
        'slide-up':       'slideUp 0.5s ease-out',
        'pop-in':         'popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '50%':      { opacity: '1',   transform: 'scale(1.2)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)',    opacity: '0.7' },
          '50%':      { transform: 'scale(1.35)', opacity: '1'   },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6', boxShadow: '0 0 20px rgba(240,168,48,0.3)' },
          '50%':      { opacity: '1',   boxShadow: '0 0 40px rgba(240,168,48,0.7)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
    },
  },
  plugins: [],
}

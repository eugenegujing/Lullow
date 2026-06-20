/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm moonlight palette — low saturation, no pure whites
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
      animation: {
        'twinkle':        'twinkle 3s ease-in-out infinite',
        'twinkle-slow':   'twinkle 5s ease-in-out infinite',
        'twinkle-slower': 'twinkle 7s ease-in-out infinite',
        'breathe':        'breathe 8s ease-in-out infinite',
        'float':          'float 6s ease-in-out infinite',
        'pulse-soft':     'pulseSoft 4s ease-in-out infinite',
        'fade-in':        'fadeIn 0.6s ease-out',
        'slide-up':       'slideUp 0.5s ease-out',
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

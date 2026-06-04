import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm rose-cream palette — replaces old blush pinks
        blush: {
          50:  '#fff5f7',
          100: '#ffe8ed',
          200: '#ffd0dc',
          300: '#ffb3c6',
          400: '#ff8fa8',
          500: '#e86b8a',
        },
        // Rose/crimson — replaces old lavender purples (class names unchanged so no component edits)
        lavender: {
          300: '#ffafc5',
          400: '#ff7096',
          500: '#e84c78',
          600: '#c93060',
          700: '#9e1f50',
        },
        // Dark burgundy — replaces old dark purple ink
        ink: {
          900: '#1a080e',
          800: '#2d1218',
          700: '#4a1c28',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft:   '0 8px 32px -8px rgba(201, 48, 96, 0.22)',
        glow:   '0 0 40px -4px rgba(232, 76, 120, 0.45)',
        bubble: '0 4px 16px -4px rgba(232, 107, 138, 0.2)',
      },
      backgroundImage: {
        'gradient-romance':     'linear-gradient(135deg, #fff5f7 0%, #ffd0dc 40%, #ffb3c6 100%)',
        'gradient-bubble-me':   'linear-gradient(135deg, #e84c78 0%, #c93060 100%)',
        'gradient-bubble-them': 'linear-gradient(135deg, #ffffff 0%, #fff5f7 100%)',
      },
      animation: {
        'fade-up':    'fadeUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:    { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '0.5' }, '50%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
};
export default config;

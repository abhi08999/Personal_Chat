import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm rose-pink for backgrounds/borders
        blush: {
          50:  '#fff3f7',
          100: '#ffe0ec',
          200: '#ffc2d8',
          300: '#ff9bbf',
          400: '#f566a0',
          500: '#e84480',
        },
        // Vivid cherry/magenta accent — kept as "lavender" so no component edits needed
        lavender: {
          300: '#ffaed0',
          400: '#f56694',
          500: '#e8194d',
          600: '#c00a3a',
          700: '#8f0629',
        },
        // Near-black with warm plum undertone
        ink: {
          900: '#0a080f',
          800: '#160e22',
          700: '#271437',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft:   '0 8px 32px -8px rgba(232,25,77,0.28)',
        glow:   '0 0 40px -4px rgba(232,25,77,0.55)',
        bubble: '0 4px 16px -4px rgba(232,25,77,0.18)',
      },
      backgroundImage: {
        'gradient-romance':     'linear-gradient(135deg, #fff3f7 0%, #ffc2d8 40%, #ff9bbf 100%)',
        'gradient-bubble-me':   'linear-gradient(135deg, #e8194d 0%, #c00a3a 100%)',
        'gradient-bubble-them': 'linear-gradient(135deg, #ffffff 0%, #fff3f7 100%)',
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

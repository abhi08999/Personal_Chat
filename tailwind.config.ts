import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        blush: { 50: '#fdf5f8', 100: '#f8e8ee', 200: '#f1d2dd', 300: '#e8c5d0', 400: '#dba6b9', 500: '#c98aa3' },
        lavender: { 300: '#d4b8e8', 400: '#c9a0dc', 500: '#b487cf', 600: '#9b72cf', 700: '#7e5bb0' },
        ink: { 900: '#1a0f1a', 800: '#2a1a2e', 700: '#3d2840' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 32px -8px rgba(155, 114, 207, 0.25)',
        glow: '0 0 40px -4px rgba(201, 160, 220, 0.4)',
        bubble: '0 4px 16px -4px rgba(201, 138, 163, 0.2)',
      },
      backgroundImage: {
        'gradient-romance': 'linear-gradient(135deg, #fdf5f8 0%, #f1d2dd 40%, #d4b8e8 100%)',
        'gradient-bubble-me': 'linear-gradient(135deg, #c9a0dc 0%, #9b72cf 100%)',
        'gradient-bubble-them': 'linear-gradient(135deg, #ffffff 0%, #fdf5f8 100%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '0.5' }, '50%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
};
export default config;

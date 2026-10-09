/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        clash: {
          red: '#EF4444',
          blue: '#3B82F6',
          green: '#10B981',
          yellow: '#F59E0B',
          dark: '#0F172A',
          card: '#1E293B',
          accent: '#8B5CF6',
        },
      },
      animation: {
        'bounce-subtle': 'bounceSubtle 1s ease-in-out infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'card-play': 'cardPlay 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        cardPlay: {
          '0%': { transform: 'scale(0.8) translateY(20px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
      },
      minHeight: {
        'screen-dvh': '100dvh',
      },
      height: {
        'screen-dvh': '100dvh',
      },
    },
  },
  plugins: [],
};

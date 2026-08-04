/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Clinical Blue — primary brand color (trust, medical authority)
        clinical: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#1a6fbd',
          600: '#155fa3',
          700: '#104e88',
          800: '#0c3d6e',
          900: '#082d54',
          950: '#051c36',
        },
        // Mint Green — health, wellness, live status
        mint: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#0ea875',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        // Navy — dark mode surfaces
        navy: {
          950: '#0a1628',
          900: '#0f1e36',
          800: '#162849',
          700: '#1e3560',
          600: '#264278',
        },
        // Neutral surfaces (light-first clinical)
        surface: {
          light: '#f7fafd',
          white: '#ffffff',
          dark:  '#0a1628',
          card:  '#0f1e36',
        },
        // Alert/status
        alert: {
          red:    '#e53e3e',
          amber:  '#d97706',
          green:  '#0ea875',
        },
      },
      boxShadow: {
        // Soft, clean clinical shadows
        'card':    '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
        'card-md': '0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)',
        'card-lg': '0 8px 24px 0 rgba(0,0,0,0.10), 0 4px 8px -2px rgba(0,0,0,0.06)',
        'clinical': '0 0 0 3px rgba(26,111,189,0.15)',
        'focus':    '0 0 0 3px rgba(26,111,189,0.30)',
        // Legacy compat
        'premium':    '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'premium-lg': '0 4px 20px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'fade-in':   'fadeIn 0.25s ease-out both',
        'slide-up':  'slideUp 0.3s ease-out both',
        'slide-in':  'slideIn 0.3s ease-out',
        'fade-up':   'fadeUp 0.4s ease-out',
        'chime':     'chime 0.6s ease-in-out',
        'marquee':   'marquee 28s linear infinite',
        'pulse-dot': 'pulseDot 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        fadeUp: {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        chime: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%':       { transform: 'scale(1.05)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.4' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}

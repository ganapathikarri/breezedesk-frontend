/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        brand: 'rgb(var(--brand-rgb) / <alpha-value>)',
        'brand-hover': 'rgb(var(--brand-hover-rgb) / <alpha-value>)',
        background: 'rgb(var(--background-rgb) / <alpha-value>)',
        'surface-50': 'rgb(var(--surface-50-rgb) / <alpha-value>)',
        'surface-100': 'rgb(var(--surface-100-rgb) / <alpha-value>)',
        'surface-200': 'rgb(var(--surface-200-rgb) / <alpha-value>)',
        'text-900': 'rgb(var(--text-900-rgb) / <alpha-value>)',
        'text-600': 'rgb(var(--text-600-rgb) / <alpha-value>)',
        destructive: 'oklch(var(--destructive-oklch) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.625rem',
        lg: '0.625rem',
        '2xl': '1rem',
      },
      boxShadow: {
        rest: '0 1px 2px rgba(15,23,42,0.04)',
        hover: '0 20px 40px -20px rgba(15,23,42,0.18)',
        'brand-glow': '0 14px 32px -16px color-mix(in oklab, var(--brand) 72%, transparent)',
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}

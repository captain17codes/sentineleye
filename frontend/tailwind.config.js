/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg': '#0b0f0e',
        'panel': '#111816',
        'raised': '#16201c',
        'panel-light': '#16201c',
        'border': '#2a3832',
        'border-subtle': '#2a3832',
        'text': '#f1f5f3',
        'muted': '#b4c2bb',
        'subtle': '#8fa097',
        'accent': '#22c55e',
        'accent-hover': '#16a34a',
        'accent-dim': '#16201c',
        // Severity colors (strictly for badges & map polygons)
        'critical': '#ef4444',
        'high': '#f59e0b',
        'medium': '#eab308',
        'low': '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'DEFAULT': '8px',
        'sm': '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
      },
      boxShadow: {
        'flat': '0 1px 3px rgba(0, 0, 0, 0.35)',
        'panel': '0 2px 8px rgba(0, 0, 0, 0.45)',
        'none': 'none',
      },
    },
  },
  plugins: [],
};

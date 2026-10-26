/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg': '#0a0a0a',
        'panel': '#121212',
        'raised': '#1a1a1a',
        'panel-light': '#1a1a1a',
        'border': '#2e2e2e',
        'border-subtle': '#2e2e2e',
        'text': '#f5f5f0',
        'muted': '#b5b5ad',
        'subtle': '#8f8f86',
        'accent': '#facc15',
        'accent-hover': '#eab308',
        'accent-dim': '#1a1a1a',
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

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Zinc / shadcn style dark theme palette
        zinc: {
          950: '#09090b',
          900: '#0c0c0f',
          800: '#1e1e24',
          700: '#3f3f46',
          400: '#a1a1aa',
          50: '#fafafa',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

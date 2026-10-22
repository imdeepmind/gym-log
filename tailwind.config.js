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
        // Flat primary palette from todo.imdeepmind.com
        primary: {
          DEFAULT: '#d9083c',
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f9d2da',
          300: '#f4a4b5',
          400: '#ee6b88',
          500: '#d9083c',
          600: '#c50736',
          700: '#a7062e',
          800: '#8b0829',
          900: '#760421',
          light: '#f71d53',
          lighter: '#f94e79',
          dark: '#a7062e',
          darker: '#760421',
        },
        // Flat surfaces matching todo.imdeepmind.com
        surface: {
          bg: {
            light: '#ffffff',
            dark: '#121212',
          },
          card: {
            light: '#ffffff',
            dark: '#161616',
          },
          hover: {
            light: '#f5f5f5',
            dark: '#1e1e1e',
          },
          border: {
            light: '#e0e0e0',
            dark: '#2a2a2a',
          },
          text: {
            light: '#1a1a1a',
            dark: '#f0f0f0',
          },
          muted: {
            light: '#888888',
            dark: '#666666',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'flat': '2px',
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
      }
    },
  },
  plugins: [],
}

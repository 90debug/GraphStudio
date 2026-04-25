/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#4F46E5',
          secondary: '#EC4899',
          surface: '#F8FAFC',
        },
        clay: {
          pink: '#FFB8D1',
          blue: '#A5D8FF',
          yellow: '#FFEC99',
        },
        gsp: {
          50:  '#EEEEF3',
          100: '#e2e3e5',
          400: '#8382e2',
          500: '#5b41eb',
          600: '#5b41eb',
          700: '#4833c9',
        },
      },
      borderRadius: {
        'bento': '1.5rem',
      },
      boxShadow: {
        'clay-sm': 'inset -4px -4px 8px rgba(0,0,0,0.1), inset 4px 4px 8px rgba(255,255,255,0.8)',
        'clay-md': 'inset -8px -8px 16px rgba(0,0,0,0.1), inset 8px 8px 16px rgba(255,255,255,0.8)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 100%)',
      }
    },
  },
  plugins: [],
}
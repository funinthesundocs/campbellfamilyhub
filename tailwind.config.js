/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'accent-gold': '#c9a962',
        'accent-sage': '#7a9a6d',
        dark: {
          bg: '#0f0f0f',
          card: '#1a1a1a',
          border: '#2a2a2a',
        },
        light: {
          bg: '#faf9f6',
          card: '#ffffff',
          border: '#e5e5e5',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        logo: ['Amarante', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

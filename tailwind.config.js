/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { brand: { 50: '#eef4ff', 100: '#d9e5ff', 500: '#2f6bff', 600: '#1f54d6', 700: '#1a44ad' } },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['ui-monospace', 'SFMono-Regular', 'monospace'] },
    },
  },
  plugins: [],
};

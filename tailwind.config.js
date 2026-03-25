/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#111118',
          sidebar: '#16161f',
          viewport: '#0d0d14',
        },
      },
    },
  },
  plugins: [],
}

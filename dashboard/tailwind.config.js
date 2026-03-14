/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stellar: {
          blue: '#3E1BDB',
          purple: '#7B61FF',
          dark: '#0D0B1E',
          gray: '#1A1A2E',
        }
      }
    },
  },
  plugins: [],
}

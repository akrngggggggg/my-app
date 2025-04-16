/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",  // ← jsx も必須！
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
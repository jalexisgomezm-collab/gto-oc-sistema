/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        verde: {
          DEFAULT: "#02934E",
          claro: "#EAF7EF",
          oscuro: "#016B39"
        }
      }
    }
  },
  plugins: []
};

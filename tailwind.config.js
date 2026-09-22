/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe7ff",
          500: "#3b6df0",
          600: "#2f5ad6",
          700: "#2547ad",
        },
      },
    },
  },
  plugins: [],
};

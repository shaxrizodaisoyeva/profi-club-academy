/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0B3A82", deep: "#082B62" },
        sky: "#6FA8E8",
        gold: { DEFAULT: "#F0CB4A", deep: "#C9A22F" },
        sage: "#3E8E71",
        clay: "#C1502E",
        paper: "#EEF2F8",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

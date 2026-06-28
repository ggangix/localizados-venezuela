import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5fa",
          100: "#dce8f5",
          200: "#b8cfea",
          300: "#8aafd4",
          500: "#2b5c8a",
          600: "#1f4870",
          700: "#163758",
          800: "#0e2640",
          900: "#07162a",
          950: "#040c18",
        },
        action: {
          50: "#ecfdf5",
          100: "#d1fae5",
          600: "#059669",
          700: "#047857",
        },
        alert: {
          bg: "#fffbeb",
          border: "#f59e0b",
          text: "#78350f",
        },
      },
      boxShadow: {
        soft: "0 18px 45px -28px rgba(8, 51, 68, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;

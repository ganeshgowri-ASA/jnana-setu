import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        saffron: "#f59e0b",
        ink: "#0f172a",
        parchment: "#fef7e6",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
        devanagari: ["Noto Sans Devanagari", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

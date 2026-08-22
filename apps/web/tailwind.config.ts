import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080c14",
        surface: {
          50: "#1e293b",
          100: "#151e2e",
          200: "#0f172a",
          300: "#0a0f1d",
        },
        cyber: {
          cyan: "#06b6d4",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
          indigo: "#6366f1",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Courier New", "monospace"],
      },
      borderColor: {
        subtle: "rgba(255, 255, 255, 0.08)",
        highlight: "rgba(6, 182, 212, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;

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
        background: "#030303",
        matte: {
          bg: "#030303",
          sidebar: "#050505",
          surface: "#060606",
          card: "#080808",
          elevated: "#0B0B0B",
          input: "#090909",
          border: "rgba(255, 255, 255, 0.07)",
          borderActive: "rgba(255, 255, 255, 0.12)",
        },
        slate: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#E5E5E5",
          300: "#D4D4D4",
          400: "#A1A1A1",
          500: "#666666",
          600: "#444444",
          700: "#222222",
          800: "#121212",
          850: "#0D0D0D",
          900: "#080808",
          950: "#030303",
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
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Courier New", "monospace"],
      },
      borderColor: {
        subtle: "rgba(255, 255, 255, 0.07)",
        active: "rgba(255, 255, 255, 0.12)",
        highlight: "rgba(6, 182, 212, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;

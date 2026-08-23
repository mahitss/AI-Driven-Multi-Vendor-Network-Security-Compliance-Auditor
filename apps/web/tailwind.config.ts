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
        background: "#070707",
        surface: {
          primary: "#050505",
          app: "#070707",
          sidebar: "#080808",
          header: "#070707",
          card: "#0A0A0A",
          elevated: "#0D0D0D",
          input: "#0B0B0B",
          hover: "#111111",
          active: "#141414",
        },
        matte: {
          bg: "#050505",
          app: "#070707",
          sidebar: "#080808",
          header: "#070707",
          card: "#0A0A0A",
          elevated: "#0D0D0D",
          input: "#0B0B0B",
          hover: "#111111",
          active: "#141414",
          border: "#1A1A1A",
          borderStrong: "#242424",
          divider: "#151515",
        },
        slate: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#E5E5E5",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#737373",
          600: "#666666",
          700: "#333333",
          800: "#141414",
          850: "#0D0D0D",
          900: "#0A0A0A",
          950: "#070707",
        },
        cyber: {
          cyan: "#00D9FF",
          emerald: "#22C55E",
          amber: "#F59E0B",
          rose: "#EF4444",
          indigo: "#8B5CF6",
          blue: "#3B82F6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "Menlo", "Courier New", "monospace"],
      },
      borderColor: {
        subtle: "#1A1A1A",
        strong: "#242424",
        divider: "#151515",
        highlight: "rgba(0, 217, 255, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;

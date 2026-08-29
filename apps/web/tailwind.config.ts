import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#08090B",
        surface: {
          primary: "#050608",
          app: "#08090B",
          sidebar: "#050608",
          header: "#08090B",
          card: "#0D0E12",
          elevated: "#12141A",
          input: "#090A0E",
          hover: "#151820",
          active: "#1A1D26",
        },
        matte: {
          bg: "#08090B",
          app: "#08090B",
          sidebar: "#050608",
          header: "#08090B",
          card: "#0D0E12",
          elevated: "#12141A",
          input: "#090A0E",
          hover: "#151820",
          active: "#1A1D26",
          border: "#181A22",
          borderStrong: "#222632",
          divider: "#14161E",
        },
        slate: {
          50: "#FAFAFA",
          100: "#F0F3F8",
          200: "#E2E7F0",
          300: "#C5CBD8",
          400: "#8B95A8",
          500: "#5D677A",
          600: "#444C5C",
          700: "#2B313D",
          800: "#1A1D26",
          850: "#12141A",
          900: "#0D0E12",
          950: "#08090B",
        },
        accent: {
          cyan: "#0EA5E9",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "Menlo", "Courier New", "monospace"],
      },
      borderColor: {
        subtle: "#181A22",
        strong: "#222632",
        divider: "#14161E",
        highlight: "rgba(14, 165, 233, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;

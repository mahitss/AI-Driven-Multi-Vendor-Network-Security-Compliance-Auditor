import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./apps/web/src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#080B12",
          secondary: "#0A0F18",
        },
        surface: {
          DEFAULT: "#0D121C",
          elevated: "#111827",
          hover: "#151E2D",
          input: "#0A0F18",
          primary: "#080B12",
          app: "#080B12",
          sidebar: "#0A0F18",
          header: "#080B12",
          card: "#0D121C",
        },
        border: {
          DEFAULT: "#1D2939",
          subtle: "#172131",
          active: "#263B55",
          strong: "#263B55",
        },
        primary: {
          DEFAULT: "#3B82F6",
          hover: "#2563EB",
          soft: "rgba(59, 130, 246, 0.12)",
        },
        cyan: {
          DEFAULT: "#22D3EE",
          soft: "rgba(34, 211, 238, 0.10)",
        },
        ai: {
          DEFAULT: "#8B5CF6",
          soft: "rgba(139, 92, 246, 0.10)",
        },
        success: {
          DEFAULT: "#10B981",
          soft: "rgba(16, 185, 129, 0.10)",
        },
        warning: {
          DEFAULT: "#F59E0B",
          soft: "rgba(245, 158, 11, 0.10)",
        },
        critical: {
          DEFAULT: "#EF4444",
          soft: "rgba(239, 68, 68, 0.10)",
        },
        info: {
          DEFAULT: "#60A5FA",
          soft: "rgba(96, 165, 250, 0.10)",
        },
        text: {
          primary: "#F3F4F6",
          secondary: "#A7B0C0",
          muted: "#667085",
          disabled: "#475467",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "Menlo", "Courier New", "monospace"],
      },
      borderColor: {
        DEFAULT: "#1D2939",
        subtle: "#172131",
        strong: "#263B55",
        active: "#263B55",
        divider: "#172131",
        highlight: "rgba(59, 130, 246, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;

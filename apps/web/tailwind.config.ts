import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#070707",
          secondary: "#0A0A0A",
        },
        surface: {
          DEFAULT: "#0B0B0B",
          elevated: "#121212",
          hover: "#181818",
          input: "#0A0A0A",
          primary: "#070707",
          app: "#070707",
          sidebar: "#080808",
          header: "#080808",
          card: "#0B0B0B",
        },
        border: {
          DEFAULT: "#1F1F1F",
          subtle: "#161616",
          active: "#2A2A2A",
          strong: "#2A2A2A",
        },
        primary: {
          DEFAULT: "#3B82F6",
          hover: "#2563EB",
          soft: "rgba(59, 130, 246, 0.08)",
        },
        cyan: {
          DEFAULT: "#22D3EE",
          soft: "rgba(34, 211, 238, 0.08)",
        },
        ai: {
          DEFAULT: "#8B5CF6",
          soft: "rgba(139, 92, 246, 0.08)",
        },
        success: {
          DEFAULT: "#10B981",
          soft: "rgba(16, 185, 129, 0.08)",
        },
        warning: {
          DEFAULT: "#F59E0B",
          soft: "rgba(245, 158, 11, 0.08)",
        },
        critical: {
          DEFAULT: "#EF4444",
          soft: "rgba(239, 68, 68, 0.08)",
        },
        info: {
          DEFAULT: "#60A5FA",
          soft: "rgba(96, 165, 250, 0.08)",
        },
        text: {
          primary: "#F2F2F2",
          secondary: "#A0A0A0",
          muted: "#666666",
          disabled: "#444444",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "Menlo", "Courier New", "monospace"],
      },
      borderColor: {
        DEFAULT: "#1F1F1F",
        subtle: "#161616",
        strong: "#2A2A2A",
        active: "#2A2A2A",
        divider: "#161616",
        highlight: "rgba(255, 255, 255, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;

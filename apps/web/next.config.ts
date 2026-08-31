import type { NextConfig } from "next";
import path from "path";

const backendUrl = (
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://ai-driven-multi-vendor-network-security.onrender.com"
    : "http://127.0.0.1:8000")
)
  .replace("localhost", "127.0.0.1")
  .replace(/\/$/, "");

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, "../../"),
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@supabase/ssr", "@supabase/supabase-js"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/health",
        destination: `${backendUrl}/health`,
      },
      {
        source: "/api/backend/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/api/health",
        destination: `${backendUrl}/health`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

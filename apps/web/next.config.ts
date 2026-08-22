import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "http://localhost:8000/api/v1/:path*",
      },
      {
        source: "/api/health",
        destination: "http://localhost:8000/health",
      },
    ];
  },
};

export default nextConfig;

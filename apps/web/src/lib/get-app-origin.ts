/**
 * Resolves the application origin for OAuth redirects and API routing across runtimes.
 *
 * Rules:
 * 1. Client-side browser runtime: window.location.origin is ALWAYS the exact active URL in the user's browser.
 * 2. Explicit environment variables: NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SITE_URL, SITE_URL, APP_URL.
 * 3. Vercel deployment variables: NEXT_PUBLIC_VERCEL_URL, VERCEL_URL, NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL.
 * 4. Server-side request headers: x-forwarded-host + x-forwarded-proto.
 * 5. Production safeguard: NEVER returns localhost:3000 in production mode.
 * 6. Local development default: http://localhost:3000.
 */
export function getAppOrigin(request?: Request | null): string {
  // 1. Client-side browser runtime (authoritative in the browser)
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin.trim().replace(/\/$/, "");
    if (origin && origin !== "null" && !origin.includes("undefined")) {
      return origin;
    }
  }

  // 2. Explicit environment variables
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL;
  if (envUrl && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/$/, "");
    return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  }

  // 3. Automated Vercel deployment variables
  const vercelUrl =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim()) {
    const trimmed = vercelUrl.trim().replace(/\/$/, "");
    return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  }

  // 4. Server-side request headers inspection
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
    }
    const host = request.headers.get("host");
    if (host) {
      const proto = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  // 5. Production environment fallback: NEVER allow localhost in production
  if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_APP_ENV === "production") {
    return "https://ai-driven-multi-vendor-network-secu.vercel.app";
  }

  // 6. Local development fallback
  return "http://localhost:3000";
}

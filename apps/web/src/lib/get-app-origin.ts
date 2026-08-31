/**
 * Resolves the application origin for OAuth redirects and API routing across runtimes.
 *
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL environment variables
 * 2. Vercel deployment URL (NEXT_PUBLIC_VERCEL_URL / VERCEL_URL)
 * 3. Client-side window.location.origin (authoritative in browser)
 * 4. Server-side request headers (x-forwarded-host + x-forwarded-proto)
 * 5. Default fallback to http://localhost:3000
 */
export function getAppOrigin(request?: Request | null): string {
  // 1. Explicit environment variable configured in production
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/$/, "");
    return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  }

  // 2. Automated Vercel environment variable
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim()) {
    const trimmed = vercelUrl.trim().replace(/\/$/, "");
    return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  }

  // 3. Client-side browser runtime (window.location.origin)
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  // 4. Server-side request headers inspection
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
    }
    const host = request.headers.get("host");
    if (host && !host.includes("localhost")) {
      return `https://${host}`.replace(/\/$/, "");
    }
    try {
      const url = new URL(request.url);
      if (url.origin && !url.origin.includes("localhost")) {
        return url.origin.replace(/\/$/, "");
      }
    } catch {
      // ignore
    }
  }

  // 5. Default development fallback
  return "http://localhost:3000";
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

// Explicit Protected Application / SOC route prefixes requiring active operator identity
const PROTECTED_PREFIXES = [
  "/console",
  "/dashboard",
  "/configurations",
  "/findings",
  "/risk",
  "/remediation",
  "/reports",
  "/operations",
  "/multi-vendor",
  "/audits",
  "/devices",
  "/adaptive-training",
  "/ai-boundary",
  "/ai-assistant",
  "/ai-security-briefing",
  "/compliance",
  "/settings",
  "/agent",
  "/security-time-machine",
];

// Explicit Public Routes that MUST ALWAYS be accessible without redirect to /login
const PUBLIC_EXACT_ROUTES = new Set([
  "/",
  "/landing",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/demo",
  "/demo/multi-vendor",
  "/demo/judge",
]);

const PUBLIC_PREFIXES = [
  "/auth",
  "/api",
  "/_next",
  "/favicon.ico",
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // 1. Root and public pages are ALWAYS accessible without authentication
  if (pathname === "/" || PUBLIC_EXACT_ROUTES.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    // If Supabase OAuth redirects to any non-callback path with ?code=, route to /auth/callback
    if (request.nextUrl.searchParams.has("code") && pathname !== "/auth/callback") {
      const callbackUrl = request.nextUrl.clone();
      callbackUrl.pathname = "/auth/callback";
      return NextResponse.redirect(callbackUrl);
    }

    // If already authenticated and accessing login or signup, redirect to safe destination
    if (pathname === "/login" || pathname === "/signup") {
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder-project")) {
        return supabaseResponse;
      }

      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const rawRedirect = request.nextUrl.searchParams.get("redirectTo");
        const safeRedirect =
          rawRedirect &&
          rawRedirect.startsWith("/") &&
          !rawRedirect.startsWith("//") &&
          !rawRedirect.startsWith("/login") &&
          !rawRedirect.startsWith("/signup") &&
          !rawRedirect.includes("://")
            ? rawRedirect
            : "/dashboard";
        const url = request.nextUrl.clone();
        url.pathname = safeRedirect;
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    // Allow all public pages to render directly without redirect
    return supabaseResponse;
  }

  // 2. Check if route is protected
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtectedRoute) {
    return supabaseResponse;
  }

  // 3. For protected routes, verify user session
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder-project")) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Unauthenticated access to protected route -> redirect to /login with redirectTo preserved
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cveymgeivgnjnwnxfveu.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Protected route prefixes
const PROTECTED_PREFIXES = [
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
  "/compliance",
  "/settings",
  "/demo",
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // If Supabase credentials are not configured, allow request (development mode)
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
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If Supabase OAuth redirects to root or any non-callback path with ?code=, route to /auth/callback
  if (request.nextUrl.searchParams.has("code") && pathname !== "/auth/callback") {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isLoginPage = pathname === "/login";

  if (!user && isProtectedRoute) {
    // Unauthenticated user attempting to access protected route -> redirect to /login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    // Authenticated user on login page -> redirect to target or /dashboard
    const rawRedirect = request.nextUrl.searchParams.get("redirectTo");
    const safeRedirect =
      rawRedirect &&
      rawRedirect.startsWith("/") &&
      !rawRedirect.startsWith("//") &&
      !rawRedirect.startsWith("/login") &&
      !rawRedirect.includes("://")
        ? rawRedirect
        : "/dashboard";
    const url = request.nextUrl.clone();
    url.pathname = safeRedirect;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

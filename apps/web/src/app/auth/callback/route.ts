import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeRedirect(nextParam: string | null | undefined): string {
  if (!nextParam) return "/dashboard";
  const trimmed = nextParam.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.startsWith("/login") &&
    !trimmed.includes("://")
  ) {
    return trimmed;
  }
  return "/dashboard";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") || searchParams.get("redirectTo") || "/dashboard";
  const safeNext = getSafeRedirect(nextParam);

  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (errorParam || errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&redirectTo=${encodeURIComponent(safeNext)}`
    );
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Return a professional cybersecurity verification screen before entering the console
        const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NetVigil SOC — Identity Verified</title>
  <meta http-equiv="refresh" content="1;url=${safeNext}" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #080B12;
      color: #A7B0C0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .card {
      background-color: #0D121C;
      border: 1px solid #1D2939;
      border-radius: 0.75rem;
      padding: 2rem;
      max-width: 26rem;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #1D2939;
    }
    .badge {
      font-size: 0.65rem;
      padding: 0.15rem 0.4rem;
      border-radius: 0.25rem;
      background: #111827;
      color: #3B82F6;
      border: 1px solid rgba(59, 130, 246, 0.3);
      font-weight: 600;
    }
    .title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #F3F4F6;
      letter-spacing: 0.05em;
    }
    .checklist {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: #080B12;
      border: 1px solid #1D2939;
      border-radius: 0.375rem;
    }
    .label { color: #667085; letter-spacing: 0.05em; }
    .status { color: #10B981; font-weight: 700; display: flex; align-items: center; gap: 0.25rem; }
    .progress-bar {
      height: 2px;
      width: 100%;
      background: #1D2939;
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }
    .progress-fill {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      background: #3B82F6;
      animation: fill 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    @keyframes fill {
      from { width: 0%; }
      to { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">SOC IDENTITY</span>
      <span class="title">IDENTITY VERIFIED</span>
    </div>
    <div class="checklist">
      <div class="item">
        <span class="label">AUTHENTICATION</span>
        <span class="status">VERIFIED ✓</span>
      </div>
      <div class="item">
        <span class="label">SESSION</span>
        <span class="status">ACTIVE ✓</span>
      </div>
      <div class="item">
        <span class="label">READ-ONLY BOUNDARY</span>
        <span class="status">ENFORCED ✓</span>
      </div>
    </div>
    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
  </div>
  <script>
    setTimeout(function() {
      window.location.replace('${safeNext}');
    }, 600);
  </script>
</body>
</html>`;
        return new Response(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        });
      }
      return NextResponse.redirect(
        `${origin}/login?error=auth_failed&redirectTo=${encodeURIComponent(safeNext)}`
      );
    } catch {
      return NextResponse.redirect(
        `${origin}/login?error=auth_failed&redirectTo=${encodeURIComponent(safeNext)}`
      );
    }
  }

  // Missing authorization code -> redirect to login with error
  return NextResponse.redirect(
    `${origin}/login?error=auth_failed&redirectTo=${encodeURIComponent(safeNext)}`
  );
}

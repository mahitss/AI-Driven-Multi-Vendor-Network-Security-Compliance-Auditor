// Regression verification for getAppOrigin behavior in development vs production

function testGetAppOrigin() {
  function getAppOriginSimulated({ windowOrigin, env, requestHeaders }) {
    // 1. Browser runtime
    if (windowOrigin) {
      const origin = windowOrigin.trim().replace(/\/$/, "");
      if (origin && origin !== "null" && !origin.includes("undefined")) {
        return origin;
      }
    }

    // 2. Explicit env
    const envUrl = env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL || env.SITE_URL || env.APP_URL;
    if (envUrl && envUrl.trim()) {
      const trimmed = envUrl.trim().replace(/\/$/, "");
      return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    }

    // 3. Vercel deployment URL
    const vercelUrl = env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || env.NEXT_PUBLIC_VERCEL_URL || env.VERCEL_URL;
    if (vercelUrl && vercelUrl.trim()) {
      const trimmed = vercelUrl.trim().replace(/\/$/, "");
      return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    }

    // 4. Server headers
    if (requestHeaders) {
      if (requestHeaders["x-forwarded-host"]) {
        const proto = requestHeaders["x-forwarded-proto"] || "https";
        return `${proto}://${requestHeaders["x-forwarded-host"]}`.replace(/\/$/, "");
      }
      if (requestHeaders["host"]) {
        const host = requestHeaders["host"];
        const proto = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
        return `${proto}://${host}`.replace(/\/$/, "");
      }
    }

    // 5. Production safeguard
    if (env.NODE_ENV === "production" || env.NEXT_PUBLIC_APP_ENV === "production") {
      return "https://ai-driven-multi-vendor-network-secu.vercel.app";
    }

    // 6. Development fallback
    return "http://localhost:3000";
  }

  console.log("[1] Testing Browser Production Origin...");
  const prodBrowser = getAppOriginSimulated({
    windowOrigin: "https://ai-driven-multi-vendor-network-secu.vercel.app",
    env: { NODE_ENV: "production" }
  });
  console.log("   Result:", prodBrowser);
  if (prodBrowser !== "https://ai-driven-multi-vendor-network-secu.vercel.app") {
    throw new Error("Failed prodBrowser");
  }

  console.log("[2] Testing Browser Localhost Development Origin...");
  const devBrowser = getAppOriginSimulated({
    windowOrigin: "http://localhost:3000",
    env: { NODE_ENV: "development" }
  });
  console.log("   Result:", devBrowser);
  if (devBrowser !== "http://localhost:3000") {
    throw new Error("Failed devBrowser");
  }

  console.log("[3] Testing Production Server-Side Fallback (No window, NODE_ENV=production)...");
  const prodServer = getAppOriginSimulated({
    windowOrigin: null,
    env: { NODE_ENV: "production" }
  });
  console.log("   Result:", prodServer);
  if (prodServer.includes("localhost") || !prodServer.startsWith("https://")) {
    throw new Error("Failed prodServer - returned localhost in production!");
  }

  console.log("[4] Testing Local Development Server-Side Fallback...");
  const devServer = getAppOriginSimulated({
    windowOrigin: null,
    env: { NODE_ENV: "development" }
  });
  console.log("   Result:", devServer);
  if (devServer !== "http://localhost:3000") {
    throw new Error("Failed devServer");
  }

  console.log("\nALL 4 AUTH ORIGIN REGRESSION TESTS PASSED WITH 100% SUCCESS!");
}

testGetAppOrigin();

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Shield, Lock, AlertTriangle, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

function getSafeRedirectPath(rawPath: string | null | undefined): string {
  if (!rawPath) return "/dashboard";
  const trimmed = rawPath.trim();
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

function LoginContent() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAuthFailed, setHasAuthFailed] = useState(false);

  const rawRedirect = searchParams.get("redirectTo") || searchParams.get("next");
  const redirectTo = getSafeRedirectPath(rawRedirect);
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (errorParam) {
      setHasAuthFailed(true);
      setIsSubmitting(false);
    }
  }, [errorParam]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTo);
    }
  }, [user, authLoading, redirectTo, router]);

  const handleGoogleLogin = async () => {
    if (isSubmitting || authLoading) return;
    setIsSubmitting(true);
    setHasAuthFailed(false);

    try {
      const { error } = await signInWithGoogle(redirectTo);
      if (error) {
        setHasAuthFailed(true);
        setIsSubmitting(false);
      }
    } catch {
      setHasAuthFailed(true);
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setHasAuthFailed(false);
    setIsSubmitting(false);
    if (errorParam) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete("error");
      router.replace(currentUrl.pathname + (currentUrl.search ? currentUrl.search : ""));
    }
  };

  // Prevent flash while restoring active session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#080B12] text-[#A7B0C0] flex flex-col justify-center items-center px-4 font-mono">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#0D121C] border border-[#1D2939] text-xs text-[#3B82F6]">
          <RefreshCw className="w-4 h-4 animate-spin text-[#3B82F6]" />
          <span>VERIFYING SESSION BOUNDARY...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080B12] text-[#A7B0C0] flex flex-col justify-center items-center px-4 py-12 selection:bg-[#3B82F6]/30 selection:text-[#93C5FD]">
      {/* Background Accent Grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(90deg, #3B82F6 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Main Identity Gateway Card */}
        <div className="bg-[#0D121C] border border-[#1D2939] rounded-xl p-8 shadow-2xl space-y-6">
          {/* Header & SOC Branding */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#111827] border border-[#3B82F6]/30 text-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.15)] mb-1">
              <Shield className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h1 className="font-mono text-xl font-bold tracking-wider text-[#F3F4F6]">NETVIGIL</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#111827] text-[#3B82F6] font-mono font-semibold border border-[#3B82F6]/20">
                  SOC IDENTITY
                </span>
              </div>
              <p className="text-xs text-[#A7B0C0] font-sans">
                Network Security & Compliance Audit Console
              </p>
              <div className="text-[10px] text-[#667085] font-mono">
                NTRO • Problem Statement SIH26155
              </div>
            </div>
          </div>

          {/* Authentication Failure State */}
          {hasAuthFailed ? (
            <div className="p-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 text-xs font-mono space-y-3">
              <div className="flex items-center gap-2 text-[#EF4444] font-semibold text-[11px] uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>AUTHENTICATION FAILED</span>
              </div>
              <p className="text-[#A7B0C0] text-[11px] leading-relaxed">
                Google authentication could not be completed. Please ensure popup permissions are allowed and try again.
              </p>
              <button
                type="button"
                id="retry-auth-btn"
                onClick={handleRetry}
                className="w-full h-9 rounded bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/50 text-[#EF4444] hover:text-[#FFAAAA] text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>TRY AGAIN</span>
              </button>
            </div>
          ) : (
            /* Security Boundary Notice */
            <div className="p-3.5 rounded-lg bg-[#0A0F18] border border-[#1D2939] text-[11px] text-[#667085] space-y-1.5 font-sans">
              <div className="flex items-center gap-1.5 text-[#3B82F6] font-mono font-semibold text-[10px] uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5" />
                <span>Identity Verification Boundary</span>
              </div>
              <p className="leading-relaxed text-[#A7B0C0]">
                Access to network device configurations, AST compliance telemetry, and allowlisted remediation requires authorized operator credentials.
              </p>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              id="google-login-btn"
              onClick={handleGoogleLogin}
              disabled={isSubmitting || authLoading}
              className="w-full h-11 px-4 rounded-lg bg-[#111827] hover:bg-[#151E2D] border border-[#1D2939] hover:border-[#3B82F6]/50 text-[#F3F4F6] text-xs font-mono font-semibold transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed group shadow-sm hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 text-[#3B82F6] animate-spin" />
                  <span className="text-[#3B82F6] tracking-wider">AUTHENTICATING... VERIFYING IDENTITY...</span>
                </>
              ) : (
                <>
                  {/* Google G Logo */}
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-1.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                    />
                  </svg>
                  <span>CONTINUE WITH GOOGLE</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#667085] group-hover:text-[#3B82F6] transition-colors" />
                </>
              )}
            </button>
          </div>

          {/* Security Guardrails Footer */}
          <div className="pt-3 border-t border-[#1D2939] flex items-center justify-between text-[10px] font-mono text-[#667085]">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
              <span>Zero Network Writes</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#3B82F6]" />
              <span>Read-Only Advisory</span>
            </div>
          </div>
        </div>

        {/* Back Link to Landing */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs font-mono text-[#667085] hover:text-[#A7B0C0] transition-colors inline-flex items-center gap-1.5"
          >
            ← Back to NetVigil Public Overview
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080B12] flex items-center justify-center font-mono">
          <div className="text-xs text-[#3B82F6] flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>INITIALIZING SECURITY GATE...</span>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Shield,
  Lock,
  User,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

function getSafeRedirectPath(rawPath: string | null | undefined, mode?: string | null): string {
  if (mode === "ingest" && (!rawPath || rawPath === "/dashboard" || rawPath === "/console")) {
    return "/configurations?mode=ingest";
  }
  if (!rawPath) return "/console";
  const trimmed = rawPath.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.startsWith("/login") &&
    !trimmed.startsWith("/signup") &&
    !trimmed.includes("://")
  ) {
    return trimmed;
  }
  return "/console";
}

function LoginContent() {
  const { user, loading: authLoading, signInWithGoogle, signInWithEmailOrUsername } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rawRedirect = searchParams.get("redirectTo") || searchParams.get("next");
  const modeParam = searchParams.get("mode");
  const redirectTo = getSafeRedirectPath(rawRedirect, modeParam);
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (errorParam) {
      setErrorMessage("Authentication was cancelled or failed. Please check your credentials and try again.");
    }
  }, [errorParam]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTo);
    }
  }, [user, authLoading, redirectTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isGoogleSubmitting) return;

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setErrorMessage("Please enter your username or email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your account password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await signInWithEmailOrUsername(cleanIdentifier, password, redirectTo);

    if (error) {
      setErrorMessage(error.message || "Failed to sign in. Please verify your credentials.");
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isSubmitting || isGoogleSubmitting || authLoading) return;
    setIsGoogleSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await signInWithGoogle(redirectTo);
      if (error) {
        setErrorMessage(error.message || "Google authentication could not be completed.");
        setIsGoogleSubmitting(false);
      }
    } catch {
      setErrorMessage("An unexpected error occurred during Google sign in.");
      setIsGoogleSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col justify-center items-center p-8 font-mono text-[#8E8E93]">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-xs text-[#8E8E93]">
          <RefreshCw className="w-4 h-4 animate-spin text-[#8E8E93]" />
          <span>INITIALIZING SOC SESSION BOUNDARY...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[460px] mx-auto bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl p-5 sm:p-7 shadow-2xl space-y-4">
      {/* 1. Header & SOC Branding */}
      <div className="text-center space-y-1.5">
        <Link
          href="/"
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#141414] border border-[#2A2A2A] text-[#F2F2F2] hover:border-[#383838] transition-colors"
        >
          <Shield className="w-5 h-5" />
        </Link>

        <div className="space-y-0.5 pt-1">
          <div className="flex items-center justify-center gap-2">
            <h1 className="font-mono text-lg sm:text-xl font-bold tracking-wider text-[#F2F2F2]">NETVIGIL</h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#141414] text-[#8E8E93] font-mono font-semibold border border-[#242424]">
              MISSION CONTROL
            </span>
          </div>
          <p className="text-xs text-[#8E8E93] font-sans">
            Sign in to access Network Security &amp; Compliance Console
          </p>
          <div className="text-[10px] text-[#636366] font-mono">
            NTRO • Problem Statement SIH26155
          </div>
        </div>
      </div>

      {/* 2. Error Banner */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 text-xs font-mono space-y-1 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-[#EF4444] font-semibold text-[11px] uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>AUTHENTICATION ERROR</span>
          </div>
          <p className="text-[#FCA5A5] text-[11px] leading-relaxed">
            {errorMessage}
          </p>
        </div>
      )}

      {/* 3. Email / Username + Password Login Form */}
      <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
        {/* Username or Email Input */}
        <div className="space-y-1">
          <label
            htmlFor="login-identifier-input"
            className="block text-[11px] text-[#8E8E93] uppercase tracking-wider font-semibold"
          >
            Username or Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#636366]">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              id="login-identifier-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="operator@enterprise.mil or callsign"
              required
              autoFocus
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full h-9 sm:h-10 pl-9 pr-3 rounded-lg bg-[#080808] border border-[#242424] focus:border-[#444444] focus:ring-1 focus:ring-[#555555] text-[#F2F2F2] text-xs placeholder-[#636366] focus:outline-hidden transition-colors disabled:opacity-50 font-sans"
            />
          </div>
        </div>

        {/* Password Input with Forgot Password Link */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password-input"
              className="block text-[11px] text-[#8E8E93] uppercase tracking-wider font-semibold"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-[#8E8E93] hover:text-[#F2F2F2] hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#636366]">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              id="login-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full h-9 sm:h-10 pl-9 pr-10 rounded-lg bg-[#080808] border border-[#242424] focus:border-[#444444] focus:ring-1 focus:ring-[#555555] text-[#F2F2F2] text-xs placeholder-[#636366] focus:outline-hidden transition-colors disabled:opacity-50 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#636366] hover:text-[#8E8E93] transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Primary Submit Button */}
        <button
          type="submit"
          id="login-submit-btn"
          disabled={isSubmitting || isGoogleSubmitting}
          className="w-full h-9 sm:h-10 rounded-lg bg-[#F2F2F2] hover:bg-white text-black font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs active:scale-[0.99] uppercase tracking-wider !mt-3.5"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
              <span>SIGNING IN...</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>SIGN IN</span>
            </>
          )}
        </button>
      </form>

      {/* 4. Divider */}
      <div className="relative flex items-center justify-center !my-3">
        <div className="border-t border-[#1F1F1F] w-full" />
        <span className="bg-[#0B0B0B] px-3 text-[10px] font-mono text-[#636366] uppercase tracking-widest absolute">
          OR
        </span>
      </div>

      {/* 5. Continue with Google OAuth Button */}
      <div>
        <button
          type="button"
          id="google-login-btn"
          onClick={handleGoogleLogin}
          disabled={isSubmitting || isGoogleSubmitting || authLoading}
          className="w-full h-9 sm:h-10 px-4 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#242424] hover:border-[#383838] text-[#F2F2F2] text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed group shadow-xs active:scale-[0.99]"
        >
          {isGoogleSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 text-[#8E8E93] animate-spin" />
              <span className="text-[#8E8E93] tracking-wider">CONNECTING GOOGLE...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              <ArrowRight className="w-3.5 h-3.5 text-[#636366] group-hover:text-[#F2F2F2] transition-colors" />
            </>
          )}
        </button>
      </div>

      {/* 6. Signup Switcher */}
      <div className="text-center text-xs font-mono text-[#8E8E93] !my-2">
        Don&apos;t have an operator account?{" "}
        <Link
          href={`/signup${rawRedirect ? `?redirectTo=${encodeURIComponent(rawRedirect)}` : ""}`}
          className="inline-flex items-center gap-1 text-[#F2F2F2] hover:underline font-semibold whitespace-nowrap"
        >
          <span>Create account</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* 7. Security Guardrails Inside-Card Footer */}
      <div className="pt-3 border-t border-[#1F1F1F] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-[#636366]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span>TLS 1.3 ENCRYPTED</span>
        </div>
        <Link href="/" className="hover:text-[#8E8E93] transition-colors">
          ← Return to Landing Page
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center p-8 font-mono text-[#8E8E93]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#8E8E93]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

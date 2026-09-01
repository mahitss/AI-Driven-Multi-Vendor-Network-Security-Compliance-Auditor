"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Shield,
  User,
  Mail,
  Lock,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

function getSafeRedirectPath(rawPath: string | null | undefined): string {
  if (!rawPath) return "/dashboard";
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
  return "/dashboard";
}

function SignupContent() {
  const { user, loading: authLoading, signUpWithEmail, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const rawRedirect = searchParams.get("redirectTo") || searchParams.get("next");
  const redirectTo = getSafeRedirectPath(rawRedirect);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTo);
    }
  }, [user, authLoading, redirectTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isGoogleSubmitting) return;

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Validation
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMessage("Username must be at least 3 characters long.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setErrorMessage("Username may only contain alphanumeric characters, underscores, and dashes.");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify both password fields.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error, data } = await signUpWithEmail(cleanUsername, cleanEmail, password);

    if (error) {
      setErrorMessage(error.message || "Failed to create account. Please try again.");
      setIsSubmitting(false);
      return;
    }

    // Check if email confirmation is required by Supabase project settings
    if (data?.user && !data?.session) {
      setSuccessMessage("Account created successfully! If confirmation is required, please check your email inbox to verify your account.");
      setIsSubmitting(false);
    } else {
      router.replace(redirectTo);
    }
  };

  const handleGoogleLogin = async () => {
    if (isSubmitting || isGoogleSubmitting || authLoading) return;
    setIsGoogleSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await signInWithGoogle(redirectTo);
      if (error) {
        setErrorMessage(error.message || "Google registration could not be completed.");
        setIsGoogleSubmitting(false);
      }
    } catch {
      setErrorMessage("An unexpected error occurred during Google sign in.");
      setIsGoogleSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#080B12] text-[#A7B0C0] flex flex-col justify-center items-center px-4 font-mono">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#0D121C] border border-[#1D2939] text-xs text-[#3B82F6]">
          <RefreshCw className="w-4 h-4 animate-spin text-[#3B82F6]" />
          <span>VERIFYING SOC SESSION BOUNDARY...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080B12] text-[#A7B0C0] flex flex-col justify-center items-center px-4 py-12 selection:bg-[#3B82F6]/30 selection:text-[#93C5FD]">
      {/* Subtle Background Accent Grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(90deg, #3B82F6 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="bg-[#0D121C] border border-[#1D2939] rounded-xl p-8 shadow-2xl space-y-6">
          {/* Header & SOC Branding */}
          <div className="text-center space-y-3">
            <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#111827] border border-[#3B82F6]/30 text-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.15)] mb-1 hover:border-[#3B82F6] transition-colors">
              <Shield className="w-6 h-6" />
            </Link>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h1 className="font-mono text-xl font-bold tracking-wider text-[#F3F4F6]">NETVIGIL</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#111827] text-[#3B82F6] font-mono font-semibold border border-[#3B82F6]/20">
                  OPERATOR REGISTRATION
                </span>
              </div>
              <p className="text-xs text-[#A7B0C0] font-sans">
                Create an authorized account to access deterministic compliance auditing
              </p>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/40 text-xs font-mono space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-[#10B981] font-semibold text-[11px] uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>ACCOUNT CREATED</span>
              </div>
              <p className="text-[#A7F3D0] text-[11px] leading-relaxed">
                {successMessage}
              </p>
              <div className="pt-1">
                <Link
                  href="/login"
                  className="text-[#10B981] hover:underline font-bold text-xs flex items-center gap-1"
                >
                  Proceed to Sign In →
                </Link>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 text-xs font-mono space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-[#EF4444] font-semibold text-[11px] uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>REGISTRATION ERROR</span>
              </div>
              <p className="text-[#FCA5A5] text-[11px] leading-relaxed">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 font-mono text-xs">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] text-[#A7B0C0] uppercase tracking-wider font-semibold">
                Username (Callsign)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="signup-username-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="operator_alpha"
                  required
                  autoFocus
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#080B12] border border-[#1D2939] focus:border-[#3B82F6] text-[#F3F4F6] text-xs placeholder-[#667085] focus:outline-none transition-colors disabled:opacity-50 font-mono"
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] text-[#A7B0C0] uppercase tracking-wider font-semibold">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="signup-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@enterprise.mil"
                  required
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#080B12] border border-[#1D2939] focus:border-[#3B82F6] text-[#F3F4F6] text-xs placeholder-[#667085] focus:outline-none transition-colors disabled:opacity-50 font-sans"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] text-[#A7B0C0] uppercase tracking-wider font-semibold">
                Password (min. 6 characters)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="signup-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full h-10 pl-9 pr-10 rounded-lg bg-[#080B12] border border-[#1D2939] focus:border-[#3B82F6] text-[#F3F4F6] text-xs placeholder-[#667085] focus:outline-none transition-colors disabled:opacity-50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#667085] hover:text-[#A7B0C0] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] text-[#A7B0C0] uppercase tracking-wider font-semibold">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="signup-confirm-password-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full h-10 pl-9 pr-10 rounded-lg bg-[#080B12] border border-[#1D2939] focus:border-[#3B82F6] text-[#F3F4F6] text-xs placeholder-[#667085] focus:outline-none transition-colors disabled:opacity-50 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              id="signup-submit-btn"
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full h-10 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm active:scale-[0.99] uppercase tracking-wider mt-3"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>CREATING OPERATOR IDENTITY...</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>CREATE ACCOUNT</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#1D2939] w-full" />
            <span className="bg-[#0D121C] px-3 text-[10px] font-mono text-[#667085] uppercase tracking-widest absolute">
              OR
            </span>
          </div>

          {/* Continue with Google OAuth Button */}
          <div>
            <button
              type="button"
              id="google-signup-btn"
              onClick={handleGoogleLogin}
              disabled={isSubmitting || isGoogleSubmitting || authLoading}
              className="w-full h-10 px-4 rounded-lg bg-[#111827] hover:bg-[#151E2D] border border-[#1D2939] hover:border-[#3B82F6]/50 text-[#F3F4F6] text-xs font-mono font-semibold transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed group shadow-sm active:scale-[0.99]"
            >
              {isGoogleSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 text-[#3B82F6] animate-spin" />
                  <span className="text-[#3B82F6] tracking-wider">CONNECTING GOOGLE OAUTH...</span>
                </>
              ) : (
                <>
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

          {/* Signin Switcher */}
          <div className="text-center text-xs font-mono text-[#A7B0C0] pt-1">
            Already have an account?{" "}
            <Link
              href={`/login${rawRedirect ? `?redirectTo=${encodeURIComponent(rawRedirect)}` : ""}`}
              className="text-[#3B82F6] hover:text-[#60A5FA] font-semibold hover:underline"
            >
              Sign in →
            </Link>
          </div>

          {/* Security Guardrails Footer */}
          <div className="pt-3 border-t border-[#1D2939] flex items-center justify-between text-[10px] font-mono text-[#667085]">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>TLS 1.3 ENCRYPTED</span>
            </div>
            <Link href="/" className="hover:text-[#A7B0C0] transition-colors">
              ← Return to Landing Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080B12] text-[#A7B0C0] flex justify-center items-center font-mono">
          <RefreshCw className="w-5 h-5 animate-spin text-[#3B82F6]" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}

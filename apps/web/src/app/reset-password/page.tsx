"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Lock, AlertTriangle, RefreshCw, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

function ResetPasswordContent() {
  const { updatePassword } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!password || password.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify both fields.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await updatePassword(password);

    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error.message || "Failed to update password. Your recovery link may have expired.");
    } else {
      setIsSuccess(true);
      setTimeout(() => {
        router.replace("/dashboard");
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B12] text-[#A7B0C0] flex flex-col justify-center items-center px-4 py-12 selection:bg-[#3B82F6]/30 selection:text-[#93C5FD]">
      <div className="relative w-full max-w-md">
        <div className="bg-[#0D121C] border border-[#1D2939] rounded-xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#111827] border border-[#3B82F6]/30 text-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.15)] mb-1">
              <Shield className="w-6 h-6" />
            </Link>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h1 className="font-mono text-xl font-bold tracking-wider text-[#F3F4F6]">NETVIGIL</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#111827] text-[#3B82F6] font-mono font-semibold border border-[#3B82F6]/20">
                  CREDENTIAL UPDATE
                </span>
              </div>
              <p className="text-xs text-[#A7B0C0] font-sans">
                Set a new secure access password for your operator account
              </p>
            </div>
          </div>

          {isSuccess ? (
            <div className="p-4 rounded-lg bg-[#10B981]/10 border border-[#10B981]/40 text-xs font-mono space-y-3 animate-in fade-in text-center">
              <CheckCircle2 className="w-6 h-6 text-[#10B981] mx-auto" />
              <div className="text-sm font-bold text-white">PASSWORD UPDATED SUCCESSFULLY</div>
              <p className="text-[#A7F3D0] text-[11px]">
                Your operator credentials have been updated. Redirecting you to the Security Console...
              </p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 text-xs font-mono space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-[#EF4444] font-semibold text-[11px] uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>UPDATE ERROR</span>
                  </div>
                  <p className="text-[#FCA5A5] text-[11px] leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5 font-mono text-xs">
                <div className="space-y-1.5">
                  <label className="block text-[11px] text-[#A7B0C0] uppercase tracking-wider font-semibold">
                    New Password (min. 6 chars)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      autoFocus
                      disabled={isSubmitting}
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

                <div className="space-y-1.5">
                  <label className="block text-[11px] text-[#A7B0C0] uppercase tracking-wider font-semibold">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      disabled={isSubmitting}
                      className="w-full h-10 pl-9 pr-10 rounded-lg bg-[#080B12] border border-[#1D2939] focus:border-[#3B82F6] text-[#F3F4F6] text-xs placeholder-[#667085] focus:outline-none transition-colors disabled:opacity-50 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm active:scale-[0.99] uppercase tracking-wider mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>UPDATING CREDENTIALS...</span>
                    </>
                  ) : (
                    <span>SET NEW PASSWORD</span>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="text-center text-xs font-mono text-[#A7B0C0] pt-1">
            <Link href="/login" className="text-[#3B82F6] hover:underline">
              ← Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080B12] text-[#A7B0C0] flex justify-center items-center font-mono">
          <RefreshCw className="w-5 h-5 animate-spin text-[#3B82F6]" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

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
        router.replace("/console");
      }, 2000);
    }
  };

  return (
    <div className="w-full max-w-[460px] mx-auto bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl p-5 sm:p-7 shadow-2xl space-y-4">
      <div className="text-center space-y-1.5">
        <Link
          href="/"
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#141414] border border-[#3B82F6]/30 text-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:border-[#3B82F6] transition-colors"
        >
          <Shield className="w-5 h-5" />
        </Link>

        <div className="space-y-0.5 pt-1">
          <div className="flex items-center justify-center gap-2">
            <h1 className="font-mono text-lg sm:text-xl font-bold tracking-wider text-[#F2F2F2]">NETVIGIL</h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#141414] text-[#3B82F6] font-mono font-semibold border border-[#3B82F6]/20">
              CREDENTIAL UPDATE
            </span>
          </div>
          <p className="text-xs text-[#8E8E93] font-sans">
            Set a new secure access password for your operator account
          </p>
        </div>
      </div>

      {isSuccess ? (
        <div className="p-3.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/40 text-xs font-mono space-y-2 animate-in fade-in text-center">
          <CheckCircle2 className="w-5 h-5 text-[#10B981] mx-auto" />
          <div className="text-xs font-bold text-white uppercase tracking-wider">PASSWORD UPDATED SUCCESSFULLY</div>
          <p className="text-[#A7F3D0] text-[11px]">
            Your operator credentials have been updated. Redirecting you to the Security Console...
          </p>
        </div>
      ) : (
        <>
          {errorMessage && (
            <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 text-xs font-mono space-y-1 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-[#EF4444] font-semibold text-[11px] uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>UPDATE ERROR</span>
              </div>
              <p className="text-[#FCA5A5] text-[11px] leading-relaxed">
                {errorMessage}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
            <div className="space-y-1">
              <label className="block text-[11px] text-[#8E8E93] uppercase tracking-wider font-semibold">
                New Password (min. 6 chars)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#636366]">
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
                  className="w-full h-9 sm:h-10 pl-9 pr-10 rounded-lg bg-[#080808] border border-[#1F1F1F] focus:border-[#3B82F6] text-[#F2F2F2] text-xs placeholder-[#636366] focus:outline-none transition-colors disabled:opacity-50 font-mono"
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

            <div className="space-y-1">
              <label className="block text-[11px] text-[#8E8E93] uppercase tracking-wider font-semibold">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#636366]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={isSubmitting}
                  className="w-full h-9 sm:h-10 pl-9 pr-10 rounded-lg bg-[#080808] border border-[#1F1F1F] focus:border-[#3B82F6] text-[#F2F2F2] text-xs placeholder-[#636366] focus:outline-none transition-colors disabled:opacity-50 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-9 sm:h-10 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm active:scale-[0.99] uppercase tracking-wider !mt-3.5"
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

      <div className="text-center text-xs font-mono text-[#8E8E93] !my-2">
        <Link href="/login" className="text-[#3B82F6] hover:underline">
          ← Return to Sign In
        </Link>
      </div>

      <div className="pt-3 border-t border-[#1F1F1F] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-[#636366]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span>AUTHENTICATED RECOVERY FLOW</span>
        </div>
        <Link href="/" className="hover:text-[#8E8E93] transition-colors">
          ← Return to Landing Page
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center p-8 font-mono text-[#8E8E93]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#3B82F6]" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Shield, Mail, AlertTriangle, RefreshCw, CheckCircle2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMessage("Please enter a valid operator email address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await resetPasswordForEmail(cleanEmail);

    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error.message || "Unable to send password recovery email. Please try again.");
    } else {
      setIsSuccess(true);
    }
  };

  return (
    <div className="w-full max-w-[460px] mx-auto bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl p-5 sm:p-7 shadow-2xl space-y-4">
      {/* Header & SOC Branding */}
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
              CREDENTIAL RECOVERY
            </span>
          </div>
          <p className="text-xs text-[#8E8E93] font-sans">
            Reset your SOC operator account access password
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {isSuccess ? (
        <div className="p-3.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/40 text-xs font-mono space-y-2.5 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-[#10B981] font-semibold text-[11px] uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>RECOVERY LINK TRANSMITTED</span>
          </div>
          <p className="text-[#A7F3D0] text-[11px] leading-relaxed">
            If an account exists with <span className="font-bold text-white">{email}</span>, a secure password reset link has been dispatched to your email inbox.
          </p>
          <div className="pt-1 border-t border-[#10B981]/20">
            <Link
              href="/login"
              className="w-full h-9 rounded bg-[#10B981]/20 hover:bg-[#10B981]/30 border border-[#10B981]/50 text-[#10B981] text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <span>RETURN TO SIGN IN</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 text-xs font-mono space-y-1 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-[#EF4444] font-semibold text-[11px] uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>RECOVERY ERROR</span>
              </div>
              <p className="text-[#FCA5A5] text-[11px] leading-relaxed">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Password Reset Form */}
          <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
            <div className="space-y-1">
              <label
                htmlFor="forgot-password-email-input"
                className="block text-[11px] text-[#8E8E93] uppercase tracking-wider font-semibold"
              >
                Account Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#636366]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="forgot-password-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@enterprise.mil"
                  required
                  autoFocus
                  disabled={isSubmitting}
                  className="w-full h-9 sm:h-10 pl-9 pr-3 rounded-lg bg-[#080808] border border-[#242424] focus:border-[#444444] focus:ring-1 focus:ring-[#555555] text-[#F2F2F2] text-xs placeholder-[#636366] focus:outline-hidden transition-colors disabled:opacity-50 font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              id="forgot-password-submit-btn"
              disabled={isSubmitting}
              className="w-full h-9 sm:h-10 rounded-lg bg-[#F2F2F2] hover:bg-white text-black font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs active:scale-[0.99] uppercase tracking-wider !mt-3.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>DISPATCHING RECOVERY LINK...</span>
                </>
              ) : (
                <span>SEND RECOVERY LINK</span>
              )}
            </button>
          </form>
        </>
      )}

      {/* Return Links */}
      <div className="text-center text-xs font-mono text-[#8E8E93] !my-2 flex items-center justify-center gap-2">
        <Link
          href="/login"
          className="text-[#F2F2F2] hover:underline font-semibold flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back to Sign in</span>
        </Link>
      </div>

      {/* Security Guardrails Footer */}
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

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
                  CREDENTIAL RECOVERY
                </span>
              </div>
              <p className="text-xs text-[#A7B0C0] font-sans">
                Reset your SOC operator account access password
              </p>
            </div>
          </div>

          {/* Success Banner */}
          {isSuccess ? (
            <div className="p-4 rounded-lg bg-[#10B981]/10 border border-[#10B981]/40 text-xs font-mono space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-[#10B981] font-semibold text-[11px] uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>RECOVERY LINK TRANSMITTED</span>
              </div>
              <p className="text-[#A7F3D0] text-[11px] leading-relaxed">
                If an account exists with <span className="font-bold text-white">{email}</span>, a secure password reset link has been dispatched to your email inbox.
              </p>
              <div className="pt-2 border-t border-[#10B981]/20">
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
                <div className="p-3.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 text-xs font-mono space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-[#EF4444] font-semibold text-[11px] uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>RECOVERY ERROR</span>
                  </div>
                  <p className="text-[#FCA5A5] text-[11px] leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              )}

              {/* Password Reset Form */}
              <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
                <div className="space-y-1.5">
                  <label className="block text-[11px] text-[#A7B0C0] uppercase tracking-wider font-semibold">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
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
                      className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#080B12] border border-[#1D2939] focus:border-[#3B82F6] text-[#F3F4F6] text-xs placeholder-[#667085] focus:outline-none transition-colors disabled:opacity-50 font-sans"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="forgot-password-submit-btn"
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm active:scale-[0.99] uppercase tracking-wider mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
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
          <div className="text-center text-xs font-mono text-[#A7B0C0] pt-1 flex items-center justify-center gap-2">
            <Link
              href="/login"
              className="text-[#3B82F6] hover:text-[#60A5FA] font-semibold hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Sign in</span>
            </Link>
          </div>

          {/* Security Guardrails Footer */}
          <div className="pt-3 border-t border-[#1D2939] flex items-center justify-between text-[10px] font-mono text-[#667085]">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>AUTHENTICATED RECOVERY FLOW</span>
            </div>
            <Link href="/" className="hover:text-[#A7B0C0] transition-colors">
              Landing Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

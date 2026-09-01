import React from "react";
import Link from "next/link";
import { Shield, Lock } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080B12] text-[#F3F4F6] font-sans antialiased flex flex-col justify-between selection:bg-[#3B82F6]/20 selection:text-[#3B82F6] relative overflow-x-hidden">
      {/* Background Ambient Grid & Radial Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1D293910_1px,transparent_1px),linear-gradient(to_bottom,#1D293910_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-[#3B82F6]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* 1. Minimal Header */}
      <header className="relative z-20 border-b border-[#1D2939]/80 bg-[#080B12]/80 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between font-mono text-xs">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-md bg-[#0D121C] border border-[#1D2939] flex items-center justify-center text-[#3B82F6] group-hover:border-[#3B82F6] transition-colors duration-150">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm tracking-wider text-[#F3F4F6]">NETVIGIL</span>
              <span className="text-[10px] text-[#3B82F6] font-semibold px-1.5 py-0.5 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/20">
                AUTH GATEWAY
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 text-[11px] text-[#A7B0C0]">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0D121C] border border-[#1D2939]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[#667085]">SECURITY:</span>
              <span className="text-[#10B981] font-semibold">ENCRYPTED</span>
            </div>
            <Link
              href="/"
              className="text-[#A7B0C0] hover:text-[#F3F4F6] transition-colors"
            >
              ← Back to Portal
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Auth Card Viewport */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* 3. Minimal Tactical Footer */}
      <footer className="relative z-20 border-t border-[#1D2939]/80 py-4 px-4 bg-[#080B12]/80 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-[#667085]">
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3 text-[#3B82F6]" />
            <span>Zero-Execution Deterministic Network Compliance Auditor</span>
          </div>
          <div className="flex items-center gap-3">
            <span>NTRO • SIH26155</span>
            <span>•</span>
            <span>SHA-256 Verified Pipeline</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-[#080B12] text-[#F3F4F6] font-sans antialiased flex flex-col justify-between selection:bg-[#3B82F6]/20 selection:text-[#3B82F6] relative overflow-x-hidden">
      {/* Subtle Background Accent Grid & Ambient Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1D293910_1px,transparent_1px),linear-gradient(to_bottom,#1D293910_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#3B82F6]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* 1. Minimal Top Authentication Header */}
      <header className="relative z-20 border-b border-[#1D2939]/80 bg-[#080B12]/80 backdrop-blur-md flex-shrink-0">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-12 sm:h-14 flex items-center justify-between font-mono text-xs">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#0D121C] border border-[#1D2939] flex items-center justify-center text-[#3B82F6] group-hover:border-[#3B82F6] transition-colors duration-150">
              <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-xs sm:text-sm tracking-wider text-[#F3F4F6]">NETVIGIL</span>
              <span className="text-[9px] sm:text-[10px] text-[#3B82F6] font-semibold px-1.5 py-0.5 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/20">
                AUTH GATEWAY
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-[11px] text-[#A7B0C0]">
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0D121C] border border-[#1D2939]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[#667085]">SECURITY:</span>
              <span className="text-[#10B981] font-semibold">ENCRYPTED</span>
            </div>
            <Link
              href="/"
              className="text-[#A7B0C0] hover:text-[#F3F4F6] transition-colors text-[11px] font-medium"
            >
              ← Back to Portal
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Auth Card Viewport (Centering Container with Natural Scroll when height is small) */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-4 md:p-6 my-auto">
        <div className="w-full max-w-[460px]">
          {children}
        </div>
      </main>
    </div>
  );
}

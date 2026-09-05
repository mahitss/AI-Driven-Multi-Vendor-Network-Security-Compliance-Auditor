import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-[#080808] text-[#F2F2F2] font-sans antialiased flex flex-col justify-between selection:bg-[#2A2A2A] selection:text-[#F2F2F2] relative overflow-x-hidden">
      {/* Subtle Background Accent Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1F1F1F10_1px,transparent_1px),linear-gradient(to_bottom,#1F1F1F10_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* 1. Minimal Top Authentication Header */}
      <header className="relative z-20 border-b border-[#1F1F1F] bg-[#080808]/90 backdrop-blur-md flex-shrink-0">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-12 sm:h-14 flex items-center justify-between font-mono text-xs">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#0D0D0D] border border-[#1F1F1F] flex items-center justify-center text-[#8E8E93] group-hover:text-[#F2F2F2] group-hover:border-[#2A2A2A] transition-colors duration-150">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-xs sm:text-sm tracking-wider text-[#F2F2F2]">NETVIGIL</span>
              <span className="text-[9px] sm:text-[10px] text-[#8E8E93] font-semibold px-1.5 py-0.5 rounded bg-[#141414] border border-[#242424]">
                AUTH GATEWAY
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-[11px] text-[#8E8E93]">
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0B0B0B] border border-[#1F1F1F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[#636366]">SECURITY:</span>
              <span className="text-[#10B981] font-semibold">ENCRYPTED</span>
            </div>
            <Link
              href="/"
              className="text-[#8E8E93] hover:text-[#F2F2F2] transition-colors text-[11px] font-medium"
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

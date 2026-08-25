"use client";

import React from "react";
import Link from "next/link";
import { Shield, Activity, Compass } from "lucide-react";

export default function LandingNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#050709]/85 backdrop-blur-md border-b border-white/[0.06] font-mono text-xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand Logo & Precision Identifier */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md bg-[#0B0F19] border border-[#00C896]/30 flex items-center justify-center text-[#00C896] group-hover:border-[#00C896] transition-colors duration-150">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm tracking-wider text-[#F5F7FA]">NETVIGIL</span>
            <span className="text-[10px] text-[#00D9FF] font-semibold px-1.5 py-0.5 rounded bg-[#00D9FF]/10 border border-[#00D9FF]/20">CORE</span>
          </div>
        </Link>

        {/* Navigation Anchors */}
        <nav className="hidden md:flex items-center gap-6 text-[#94A3B8]">
          <Link href="#architecture" className="hover:text-[#F5F7FA] transition-colors duration-150">
            Architecture
          </Link>
          <Link href="#security-intelligence" className="hover:text-[#F5F7FA] transition-colors duration-150">
            Security Intelligence
          </Link>
          <Link href="#multi-vendor" className="hover:text-[#F5F7FA] transition-colors duration-150">
            Multi-Vendor
          </Link>
          <Link href="#ai-boundary" className="hover:text-[#F5F7FA] transition-colors duration-150">
            AI Boundary
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/demo/multi-vendor"
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#0B0F19] border border-white/[0.08] hover:border-white/[0.2] text-[#E2E8F0] hover:text-white transition-all duration-150"
          >
            <Compass className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span>Explore Platform</span>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-[#00C896] hover:bg-[#00B383] text-[#050709] font-bold transition-all duration-150 active:translate-y-[0.5px] shadow-[0_0_12px_rgba(0,200,150,0.18)]"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Open Security Console →</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Shield, Play, Layers, Sparkles, Activity } from "lucide-react";

export default function LandingNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0C10]/80 backdrop-blur-md border-b border-white/5 font-mono text-xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand Logo & Identifier */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-[#0E131F] border border-[#10B981]/30 flex items-center justify-center text-[#10B981] group-hover:border-[#10B981] transition-colors">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm tracking-wider text-white">NETVIGIL</span>
            <span className="text-[10px] text-[#06B6D4] font-semibold">SIH26155</span>
          </div>
        </Link>

        {/* Navigation Anchors */}
        <nav className="hidden md:flex items-center gap-6 text-[#A3A3A3]">
          <Link href="#architecture" className="hover:text-white transition-colors">
            Architecture
          </Link>
          <Link href="#ai-boundary" className="hover:text-white transition-colors">
            AI Boundary
          </Link>
          <Link href="#multi-vendor" className="hover:text-white transition-colors">
            Multi-Vendor Proof
          </Link>
          <Link href="/demo/judge" className="hover:text-[#06B6D4] transition-colors flex items-center gap-1">
            <Play className="w-3 h-3 fill-current" />
            <span>Judge Mode</span>
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/demo"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E131F] border border-white/10 hover:border-white/20 text-[#D4D4D4] hover:text-white transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
            <span>Golden Demo</span>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-black font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)]"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Launch SOC →</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

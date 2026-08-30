"use client";

import React from "react";
import Link from "next/link";
import { Shield, Activity, Compass } from "lucide-react";

export default function LandingNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#080B12]/90 backdrop-blur-md border-b border-[#1D2939] font-mono text-xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand Logo & Precision Identifier */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md bg-[#0D121C] border border-[#1D2939] flex items-center justify-center text-[#3B82F6] group-hover:border-[#3B82F6] transition-colors duration-150">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm tracking-wider text-[#F3F4F6]">NETVIGIL</span>
            <span className="text-[10px] text-[#3B82F6] font-semibold px-1.5 py-0.5 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/20">CORE</span>
          </div>
        </Link>

        {/* Navigation Anchors */}
        <nav className="hidden md:flex items-center gap-6 text-[#A7B0C0]">
          <Link href="#architecture" className="hover:text-[#F3F4F6] transition-colors duration-150">
            Architecture
          </Link>
          <Link href="#security-intelligence" className="hover:text-[#F3F4F6] transition-colors duration-150">
            Security Intelligence
          </Link>
          <Link href="#multi-vendor" className="hover:text-[#F3F4F6] transition-colors duration-150">
            Multi-Vendor
          </Link>
          <Link href="#ai-boundary" className="hover:text-[#F3F4F6] transition-colors duration-150">
            AI Boundary
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/demo/multi-vendor"
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] text-[#A7B0C0] hover:text-[#F3F4F6] transition-all duration-150"
          >
            <Compass className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Explore Platform</span>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold transition-all duration-150 active:translate-y-[0.5px] shadow-sm"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Open Security Console →</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

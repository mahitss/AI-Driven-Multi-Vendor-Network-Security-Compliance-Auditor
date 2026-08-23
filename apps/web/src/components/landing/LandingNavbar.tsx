"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Play } from "lucide-react";
import { fetchEngineDiagnostics } from "@/lib/api-client";

export default function LandingNavbar() {
  const [isOperational, setIsOperational] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    fetchEngineDiagnostics()
      .then((data) => {
        if (mounted && data) setIsOperational(true);
      })
      .catch(() => {
        if (mounted) setIsOperational(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#1A1A1A]/80 bg-[#050505]/80 backdrop-blur-md font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#0E0E0E] border border-[#00D9FF]/40 flex items-center justify-center text-[#00D9FF] group-hover:border-[#00D9FF] transition-colors">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-widest text-[#F5F5F5] group-hover:text-[#00D9FF] transition-colors">
                NETVIGIL
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] text-[#8A8A8A] font-sans font-medium">
                SIH26155 • NTRO
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs text-[#8A8A8A]">
          <a href="#problem" className="hover:text-[#F5F5F5] transition-colors">
            Problem
          </a>
          <a href="#pipeline" className="hover:text-[#F5F5F5] transition-colors">
            Architecture
          </a>
          <a href="#ai-boundary" className="hover:text-[#F5F5F5] transition-colors">
            AI Boundary
          </a>
          <a href="#security" className="hover:text-[#F5F5F5] transition-colors">
            Safety Invariants
          </a>
        </nav>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#0A0A0A] border border-[#1A1A1A] text-[10px]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOperational ? "bg-[#22C55E] animate-pulse" : "bg-[#8A8A8A]"
              }`}
            />
            <span className="text-[#A3A3A3]">
              {isOperational ? "ENGINE OPERATIONAL" : "PLATFORM READY"}
            </span>
          </div>

          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0D0D0D] border border-[#00D9FF]/50 hover:border-[#00D9FF] hover:bg-[#141414] text-[#00D9FF] text-xs font-semibold transition-all shadow-sm"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Launch Demo</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

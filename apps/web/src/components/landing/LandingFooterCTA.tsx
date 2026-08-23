"use client";

import React from "react";
import Link from "next/link";
import { Play, ArrowRight, Shield } from "lucide-react";

export default function LandingFooterCTA() {
  return (
    <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#141414] font-sans">
      <div className="p-8 sm:p-16 rounded-2xl bg-[#090909] border border-[#1A1A1A] text-center space-y-6 relative overflow-hidden">
        <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#00D9FF]/40 flex items-center justify-center text-[#00D9FF] mx-auto">
          <Shield className="w-6 h-6" />
        </div>

        <div className="space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F5F5F5] tracking-tight">
            SEE NETVIGIL IN ACTION
          </h2>
          <p className="text-xs sm:text-sm text-[#8A8A8A]">
            Experience multi-vendor AST parsing, 60-control compliance evaluation, line-level evidence, and allowlisted remediation in our 2-minute presenter workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 font-mono">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#00D9FF] text-[#050505] font-bold text-xs hover:bg-[#33E0FF] transition-all shadow-[0_0_20px_rgba(0,217,255,0.25)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>RUN GOLDEN DEMO</span>
          </Link>

          <Link
            href="/audits"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#0E0E0E] border border-[#1A1A1A] hover:border-[#333333] text-[#D4D4D4] font-medium text-xs transition-colors"
          >
            <span>AUDIT SESSIONS</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#8A8A8A]" />
          </Link>
        </div>

        <div className="pt-8 border-t border-[#141414] text-[11px] font-mono text-[#555555] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>NetVigil v1.0.0-SIH2026-RC1</span>
          <span>National Technical Research Organisation (NTRO)</span>
        </div>
      </div>
    </section>
  );
}

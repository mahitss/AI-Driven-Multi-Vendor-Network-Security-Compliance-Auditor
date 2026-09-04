"use client";

import React from "react";
import Link from "next/link";
import { Activity, ArrowRight, Shield } from "lucide-react";

export default function LandingFooterCTA() {
  return (
    <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#1F1F1F] font-sans">
      <div className="p-8 sm:p-16 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] text-center space-y-6 relative overflow-hidden">
        <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] mx-auto">
          <Shield className="w-6 h-6" />
        </div>

        <div className="space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F2F2F2] tracking-tight">
            DEPLOY DETERMINISTIC NETWORK SECURITY
          </h2>
          <p className="text-xs sm:text-sm text-[#8E8E93]">
            Experience multi-vendor AST parsing, 60-control compliance evaluation, line-level evidence, and allowlisted remediation across enterprise infrastructure.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 font-mono">
          <Link
            href="/console"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#3B82F6] text-white font-bold text-xs hover:bg-[#2563EB] transition-all shadow-sm"
          >
            <span>GET STARTED →</span>
          </Link>

          <Link
            href="/audits"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#141414] border border-[#1F1F1F] hover:border-[#2C2C2E] text-[#F2F2F2] font-medium text-xs transition-colors"
          >
            <span>AUDIT SESSIONS</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#636366]" />
          </Link>
        </div>

        <div className="pt-8 border-t border-[#1F1F1F] text-[11px] font-mono text-[#636366] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>NetVigil v1.0.0-PROD-RC1</span>
          <span>National Technical Research Organisation (NTRO)</span>
        </div>
      </div>
    </section>
  );
}

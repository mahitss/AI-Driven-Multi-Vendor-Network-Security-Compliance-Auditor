"use client";

import React from "react";
import Link from "next/link";
import { Play, Sparkles, Shield, CheckCircle2, ArrowRight } from "lucide-react";

export default function GoldenDemoCalloutSection() {
  return (
    <section className="py-16 px-4 sm:px-6 max-w-[1440px] mx-auto font-sans">
      <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-[#0E131F] to-[#07090E] border border-[#10B981]/30 shadow-[0_0_30px_rgba(16,185,129,0.08)] flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[11px] font-mono text-[#10B981] font-bold">
            <span>CANONICAL SECURITY DEMONSTRATION</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            CISCO IOS • CORE-RTR-01
          </h3>

          <p className="text-xs sm:text-sm text-[#A3A3A3] font-mono">
            Source Configuration: <span className="text-white">cisco-core-router.cfg</span> (52 lines • SHA-256 Verified)
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-[11px] font-mono text-[#D4D4D4]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              <span>60 Deterministic Controls</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Line-Level Evidence</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Risk Correlation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Allowlisted Remediation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Grounded Advisory AI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Zero Network Push</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-3.5 w-full lg:w-auto font-mono text-xs">
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-black font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>RUN GOLDEN DEMO →</span>
          </Link>

          <Link
            href="/demo/judge"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#0E131F] border border-white/10 hover:border-white/25 hover:bg-[#141B2D] text-[#E5E5E5] font-semibold transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
            <span>JUDGE DEMO MODE →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

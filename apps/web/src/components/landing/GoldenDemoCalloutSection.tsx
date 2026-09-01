"use client";

import React from "react";
import Link from "next/link";
import { Activity, Shield, CheckCircle2, ArrowRight } from "lucide-react";

export default function GoldenDemoCalloutSection() {
  return (
    <section id="security-intelligence" className="py-16 px-4 sm:px-6 max-w-[1440px] mx-auto font-sans">
      <div className="p-8 sm:p-12 rounded-2xl bg-[#0D121C] border border-[#1D2939] shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[11px] font-mono text-[#10B981] font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>ENTERPRISE SECURITY INTELLIGENCE</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#F3F4F6] tracking-tight">
            CISCO IOS • CORE-RTR-01 POSTURE EVALUATION
          </h3>

          <p className="text-xs sm:text-sm text-[#A7B0C0] font-mono">
            Canonical Gateway Baseline: <span className="text-[#F3F4F6]">cisco-core-router.cfg</span> (52 lines • SHA-256 Verified)
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-[11px] font-mono text-[#A7B0C0]">
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
            href="/console"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold transition-all shadow-sm"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>OPEN SECURITY CONSOLE →</span>
          </Link>

          <Link
            href="/demo/multi-vendor"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#111827] border border-[#1D2939] hover:border-[#263B55] text-[#F3F4F6] font-semibold transition-all"
          >
            <span>EXPLORE MULTI-VENDOR →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

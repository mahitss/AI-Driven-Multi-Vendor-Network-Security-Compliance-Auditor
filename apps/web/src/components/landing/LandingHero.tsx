"use client";

import React from "react";
import Link from "next/link";
import { Play, ArrowRight, ShieldCheck, Terminal, Cpu, Lock } from "lucide-react";
import TopographicScene from "./TopographicScene";

export default function LandingHero() {
  return (
    <section className="relative min-h-[92vh] flex flex-col justify-center items-center px-4 sm:px-6 pt-24 pb-16 overflow-hidden bg-[#050505] text-[#F5F5F5]">
      {/* 3D Topographic Terrain Canvas in Background */}
      <TopographicScene />

      {/* Top Technical Metadata HUD */}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0A0A0A]/90 border border-[#1A1A1A] text-[11px] font-mono text-[#8A8A8A]">
          <span className="text-[#00D9FF] font-semibold">SIH26155</span>
          <span>•</span>
          <span>NATIONAL TECHNICAL RESEARCH ORGANISATION</span>
        </div>

        {/* Main Display Typography */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-sans text-[#F5F5F5] uppercase">
            NETVIGIL
          </h1>
          <p className="text-base sm:text-xl lg:text-2xl font-medium tracking-tight text-[#00D9FF] font-mono">
            AI-Driven Multi-Vendor Network Security Compliance Auditor
          </p>
        </div>

        {/* Technical Value Proposition */}
        <p className="max-w-2xl mx-auto text-xs sm:text-sm text-[#A3A3A3] leading-relaxed font-sans">
          Audit heterogeneous Cisco, Juniper, and Fortinet network configurations against CIS,
          NIST, STIG, and ISO benchmarks with mathematical precision, line-level evidence, and
          grounded advisory AI intelligence.
        </p>

        {/* Primary Call-to-Actions */}
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
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#333333] hover:bg-[#141414] text-[#D4D4D4] font-medium text-xs transition-colors"
          >
            <span>EXPLORE WORKSPACE</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#8A8A8A]" />
          </Link>
        </div>

        {/* Technical HUD Feature Anchors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-3xl mx-auto pt-8 font-mono text-[11px]">
          <div className="p-2.5 rounded-lg bg-[#0A0A0A]/80 border border-[#1A1A1A] flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span className="text-[#A3A3A3]">MULTI-VENDOR AST</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0A0A0A]/80 border border-[#1A1A1A] flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
            <span className="text-[#A3A3A3]">DETERMINISTIC RULES</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0A0A0A]/80 border border-[#1A1A1A] flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span className="text-[#A3A3A3]">AI ADVISORY ONLY</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0A0A0A]/80 border border-[#1A1A1A] flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="text-[#A3A3A3]">ZERO LIVE PUSH</span>
          </div>
        </div>
      </div>
    </section>
  );
}

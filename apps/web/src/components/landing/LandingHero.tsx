"use client";

import React from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import TopographicScene from "./TopographicScene";
import TelemetryBackground from "./TelemetryBackground";

export default function LandingHero() {
  return (
    <section className="relative min-h-[88vh] lg:min-h-[90vh] flex flex-col justify-start items-center px-4 sm:px-6 pt-28 sm:pt-32 pb-16 overflow-hidden bg-[#050709] text-[#F5F7FA]">
      {/* 1. Subtle Peripheral Instrumentation Telemetry */}
      <TelemetryBackground />

      {/* 2. Living 3D Topographic Security Surface Canvas (Starts @ 58-60% Horizon) */}
      <TopographicScene />

      {/* 3. Central Editorial Focal Hierarchy (Centered @ ~42-45% Viewport) */}
      <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
        {/* Localized subtle radial mask behind headline for crisp physical contrast */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[320px] bg-radial from-[#050709]/90 via-[#050709]/50 to-transparent blur-2xl pointer-events-none -z-10" />

        {/* Technical Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0F19]/90 border border-white/[0.08] text-[11px] font-mono text-[#94A3B8] shadow-sm mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00C98B] animate-pulse" />
          <span className="text-[#00D9FF] font-semibold tracking-wide">NTRO</span>
          <span className="text-white/20">•</span>
          <span className="text-[#00C98B] font-medium tracking-wide">DETERMINISTIC MULTI-VENDOR SECURITY</span>
        </div>

        {/* Two-Line Editorial Headline (Reduced 10% for Generous Whitespace) */}
        <div className="flex flex-col items-center">
          <h1 className="text-3xl sm:text-5xl lg:text-[62px] font-extrabold tracking-[-0.03em] font-sans text-[#F5F7FA] leading-[1.08]">
            UNDERSTAND EVERY <br />
            CONFIGURATION.
          </h1>
          <h2 className="text-2xl sm:text-4xl lg:text-[52px] font-extrabold tracking-[-0.03em] font-sans text-[#00D9FF] leading-[1.1] mt-2.5 sm:mt-3.5">
            TRUST EVERY <br className="sm:hidden" />
            DECISION.
          </h2>
        </div>

        {/* Supporting Architectural Copy (Calm 740px Container) */}
        <p className="max-w-[740px] mx-auto text-xs sm:text-[14px] text-[#94A3B8] leading-[1.7] font-sans font-normal mt-6">
          NetVigil transforms Cisco IOS, Juniper JunOS, and Fortinet FortiOS configurations into
          one Universal Security Model, evaluates them against shared security frameworks, preserves
          line-level evidence, and uses grounded AI only where interpretation is required.
        </p>

        {/* Action Controls - Mathematically Aligned 48px Height */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mt-7 font-mono text-xs">
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-lg bg-[#00C98B] hover:bg-[#00B57C] text-[#050709] font-bold text-[12px] transition-all duration-150 active:translate-y-[1px] shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_16px_rgba(0,201,139,0.18)] border border-[#00E5AA]/30 hover:border-[#00E5AA]/60"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>LAUNCH GOLDEN DEMO →</span>
          </Link>

          <Link
            href="/demo/multi-vendor"
            className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-lg bg-[#0B0F19] hover:bg-[#111726] border border-white/[0.08] hover:border-white/[0.2] text-[#F5F7FA] font-semibold text-[12px] transition-all duration-150 active:translate-y-[1px]"
          >
            <span>EXPLORE SECURITY ENGINE →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

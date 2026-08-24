"use client";

import React from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import TopographicScene from "./TopographicScene";
import TelemetryBackground from "./TelemetryBackground";

export default function LandingHero() {
  return (
    <section className="relative min-h-[740px] lg:h-[780px] xl:h-[820px] flex items-center px-6 sm:px-12 lg:px-16 xl:px-24 overflow-hidden bg-[#050709] text-[#F5F7FA]">
      {/* 1. Subtle Ambient Peripheral Telemetry Layer */}
      <TelemetryBackground />

      {/* 2. Large Environmental 3D Topographic Security Terrain (Occupies Right 60-64%) */}
      <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[60%] xl:w-[64%] h-full pointer-events-none z-0">
        <TopographicScene />
      </div>

      {/* 3. Left Content: Editorial Security Product Messaging (Z-10, Inset ~8-10vw) */}
      <div className="relative z-10 w-full max-w-[720px] flex flex-col items-start text-left">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0F19] border border-white/[0.08] text-[11px] font-mono text-[#94A3B8] shadow-sm mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00C98B] animate-pulse" />
          <span className="text-[#00D9FF] font-semibold tracking-wide">NTRO</span>
          <span className="text-white/20">•</span>
          <span className="text-[#00C98B] font-medium tracking-wide">DETERMINISTIC MULTI-VENDOR SECURITY</span>
        </div>

        {/* Two-Line Editorial Headline (Line 1: 2 lines max | Line 2: 1 line on desktop) */}
        <div className="flex flex-col">
          <h1 className="text-4xl sm:text-6xl lg:text-[72px] xl:text-[80px] font-extrabold tracking-[-0.035em] font-sans text-[#F5F7FA] leading-[0.96] max-w-[720px]">
            UNDERSTAND EVERY <br />
            CONFIGURATION.
          </h1>
          <h2 className="text-3xl sm:text-5xl lg:text-[54px] xl:text-[62px] font-extrabold tracking-[-0.035em] font-sans text-[#00D9FF] leading-[1.0] mt-3.5 whitespace-normal lg:whitespace-nowrap">
            TRUST EVERY DECISION.
          </h2>
        </div>

        {/* Supporting Architectural Copy (Calm 620px Container) */}
        <p className="max-w-[620px] text-base sm:text-[17px] text-[#94A3B8] leading-[1.5] font-sans font-normal mt-6">
          NetVigil transforms Cisco IOS, Juniper JunOS, and Fortinet FortiOS configurations into
          one Universal Security Model, evaluates them against shared security frameworks, preserves
          line-level evidence, and uses grounded AI only where interpretation is required.
        </p>

        {/* Action Controls - Mathematically Aligned 48px Height */}
        <div className="flex flex-wrap items-center gap-3.5 mt-8 font-mono text-xs">
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

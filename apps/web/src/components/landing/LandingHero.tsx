"use client";

import React from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import TopographicScene from "./TopographicScene";
import TelemetryBackground from "./TelemetryBackground";

export default function LandingHero() {
  return (
    <section className="relative min-h-[92vh] flex flex-col justify-center items-center px-4 sm:px-6 pt-28 pb-16 overflow-hidden bg-[#0A0C10] text-[#F5F5F5]">
      {/* 1. Subtle Animated Security Telemetry Layer */}
      <TelemetryBackground />

      {/* 2. Interactive High-Visibility Topographic / Terrain Canvas */}
      <TopographicScene />

      {/* 3. Dominant Hero Content Container */}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
        {/* Localized radial mask behind headline for pristine contrast without hiding surrounding terrain */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[340px] bg-radial from-[#0A0C10]/85 via-[#0A0C10]/45 to-transparent blur-2xl pointer-events-none -z-10" />

        {/* Technical Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0E131F]/90 border border-[#06B6D4]/30 text-[11px] font-mono text-[#A3A3A3] shadow-sm backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[#06B6D4] font-bold">NTRO</span>
          <span className="text-white/20">•</span>
          <span className="text-[#10B981]">DETERMINISTIC MULTI-VENDOR SECURITY</span>
        </div>

        {/* Large Two-Line Headline with Stitch Visual Hierarchy */}
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-sans text-white leading-[1.1]">
            UNDERSTAND EVERY <br />
            CONFIGURATION.
          </h1>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-sans text-[#06B6D4] leading-[1.1]">
            TRUST EVERY <br className="sm:hidden" />
            DECISION.
          </h2>
        </div>

        {/* Supporting Copy */}
        <p className="max-w-2xl mx-auto text-xs sm:text-sm text-[#A3A3A3] leading-relaxed font-sans font-normal pt-1">
          NetVigil transforms Cisco IOS, Juniper JunOS, and Fortinet FortiOS configurations into
          one Universal Security Model, evaluates them against shared security frameworks, preserves
          line-level evidence, and uses grounded AI only where interpretation is required.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3 font-mono text-xs">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-black font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>LAUNCH GOLDEN DEMO →</span>
          </Link>

          <Link
            href="/demo/multi-vendor"
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg bg-[#0E131F] border border-white/10 hover:border-white/25 hover:bg-[#141B2D] text-[#E5E5E5] font-semibold transition-all"
          >
            <span>EXPLORE SECURITY ENGINE →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

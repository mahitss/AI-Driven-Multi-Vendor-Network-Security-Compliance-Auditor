"use client";

import React from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import TopographicScene from "./TopographicScene";
import TelemetryBackground from "./TelemetryBackground";

export default function LandingHero() {
  return (
    <section className="relative min-h-[820px] lg:h-[calc(100vh-56px)] xl:min-h-[860px] flex items-center pl-6 sm:pl-10 lg:pl-16 pr-4 sm:pr-8 lg:pr-10 pt-16 pb-10 overflow-hidden bg-[#03070C] text-[#FFFFFF]">
      {/* 1. Atmospheric Ambient Peripheral Telemetry */}
      <TelemetryBackground />

      {/* 2. Strict 2-Column Hero Grid: ~38% Left / ~62% Right Matching Reference 1 */}
      <div className="w-full max-w-[1640px] mx-auto grid grid-cols-1 lg:grid-cols-[38%_62%] items-center gap-6 lg:gap-8 relative z-10">
        
        {/* LEFT COLUMN: Editorial Security Product Messaging (Max 520px Usable Space) */}
        <div className="w-full max-w-[520px] flex flex-col items-start text-left z-20">
          
          {/* Institutional Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B132B]/90 border border-white/[0.08] text-[11px] font-mono text-[#94A3B8] shadow-sm mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse" />
            <span className="text-[#00D9FF] font-semibold tracking-wide">NTRO</span>
            <span className="text-white/20">•</span>
            <span className="text-[#94A3B8] font-medium tracking-wide">DETERMINISTIC MULTI-VENDOR SECURITY</span>
          </div>

          {/* Clean Controlled Editorial Headline */}
          <h1 className="flex flex-col tracking-[-0.04em] font-sans font-extrabold text-[#FFFFFF] mb-5">
            <span className="block text-4xl sm:text-5xl lg:text-[46px] xl:text-[54px] 2xl:text-[60px] leading-[1.02] whitespace-nowrap">
              UNDERSTAND EVERY
            </span>
            <span className="block text-4xl sm:text-5xl lg:text-[46px] xl:text-[54px] 2xl:text-[60px] leading-[1.02] mt-1.5 whitespace-nowrap">
              CONFIGURATION.
            </span>
            <span className="block text-3xl sm:text-4xl lg:text-[38px] xl:text-[46px] 2xl:text-[52px] leading-[1.04] text-[#00D9FF] mt-3.5 whitespace-nowrap">
              TRUST EVERY DECISION.
            </span>
          </h1>

          {/* Supporting Architectural Copy (Max 480px Container) */}
          <p className="max-w-[480px] text-[14px] sm:text-[15px] xl:text-[16px] text-[#8B9EB3] leading-[1.6] font-sans font-normal mb-8">
            NetVigil transforms Cisco IOS, Juniper JunOS, and Fortinet FortiOS configurations into
            one Universal Security Model, evaluates them against shared security frameworks, preserves
            line-level evidence, and uses grounded AI only where interpretation is required.
          </p>

          {/* Action Controls - Aligned Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 font-mono text-xs mb-8">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg bg-[#00E5AA] hover:bg-[#00D19B] text-[#050709] font-bold text-[12px] transition-all duration-150 active:translate-y-[1px] shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_16px_rgba(0,229,170,0.2)]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>LAUNCH GOLDEN DEMO →</span>
            </Link>

            <Link
              href="/demo/multi-vendor"
              className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg bg-[#0B0F19] hover:bg-[#111726] border border-white/[0.08] hover:border-white/[0.2] text-[#F5F7FA] font-semibold text-[12px] transition-all duration-150 active:translate-y-[1px]"
            >
              <span>EXPLORE SECURITY ENGINE →</span>
            </Link>
          </div>

          {/* Faint Telemetry Footnote on Lower Left */}
          <div className="space-y-1 font-mono text-[10px] text-[#00D9FF]/30 select-none pointer-events-none">
            <div>[EVIDENCE:[LINE 17]]</div>
            <div>time_sync.ntp_enabled = false</div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Topographical Security Landscape Model (~62% width) */}
        <div className="w-full h-[540px] sm:h-[640px] lg:h-[760px] xl:h-[840px] relative flex items-center justify-center">
          <TopographicScene />
        </div>

      </div>

      {/* Floating Bottom-Left Corner Brand Node */}
      <div className="hidden lg:flex absolute bottom-5 left-6 sm:left-10 z-20 items-center justify-center w-8 h-8 rounded-full bg-[#0B132B]/80 border border-white/[0.08] text-[#8B9EB3] text-[11px] font-mono">
        N
      </div>
    </section>
  );
}

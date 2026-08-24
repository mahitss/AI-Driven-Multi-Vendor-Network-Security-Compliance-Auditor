"use client";

import React from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import TopographicScene from "./TopographicScene";
import TelemetryBackground from "./TelemetryBackground";

export default function LandingHero() {
  return (
    <section className="relative min-h-[820px] lg:h-[calc(100vh-56px)] xl:min-h-[860px] flex items-center pl-6 sm:pl-10 lg:pl-[clamp(48px,5vw,90px)] pr-4 sm:pr-8 lg:pr-10 pt-20 pb-12 overflow-hidden bg-[#030609] text-[#F5F7FA]">
      {/* 1. Subtle Ambient Peripheral Telemetry Layer */}
      <TelemetryBackground />

      {/* 2. Strict 2-Column Hero Grid: ~39% Left / ~61% Right with Clean Separation */}
      <div className="w-full max-w-[1640px] mx-auto grid grid-cols-1 lg:grid-cols-[39%_61%] items-center gap-6 lg:gap-8 relative z-10">
        
        {/* LEFT COLUMN: Editorial Security Product Messaging (Max 580px Usable Space, Right Padding 32px) */}
        <div className="w-full max-w-[580px] lg:pr-8 flex flex-col items-start text-left z-20">
          
          {/* Institutional Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0F19] border border-white/[0.08] text-[11px] font-mono text-[#94A3B8] shadow-sm mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A3] animate-pulse" />
            <span className="text-[#00C8F5] font-semibold tracking-wide">NTRO</span>
            <span className="text-white/20">•</span>
            <span className="text-[#00D6A3] font-medium tracking-wide">DETERMINISTIC MULTI-VENDOR SECURITY</span>
          </div>

          {/* Controlled Editorial Headline (64px-76px Desktop, Strictly 1-Line Spans, Zero Overlap) */}
          <h1 className="flex flex-col tracking-[-0.04em] font-sans font-extrabold text-[#F5F7FA] mb-6">
            <span className="block text-3xl sm:text-5xl lg:text-[48px] xl:text-[60px] 2xl:text-[70px] leading-[0.95] whitespace-nowrap">
              UNDERSTAND EVERY
            </span>
            <span className="block text-3xl sm:text-5xl lg:text-[48px] xl:text-[60px] 2xl:text-[70px] leading-[0.95] mt-1.5 sm:mt-2 whitespace-nowrap">
              CONFIGURATION.
            </span>
            <span className="block text-2xl sm:text-4xl lg:text-[40px] xl:text-[50px] 2xl:text-[58px] leading-[0.96] text-[#00C8F5] mt-4 sm:mt-5 whitespace-nowrap">
              TRUST EVERY DECISION.
            </span>
          </h1>

          {/* Supporting Architectural Copy (Max 560px Container) */}
          <p className="max-w-[560px] text-[15px] sm:text-[17px] xl:text-[18px] text-[#94A3B8] leading-[1.55] font-sans font-normal mb-8">
            NetVigil transforms Cisco IOS, Juniper JunOS, and Fortinet FortiOS configurations into
            one Universal Security Model, evaluates them against shared security frameworks, preserves
            line-level evidence, and uses grounded AI only where interpretation is required.
          </p>

          {/* Action Controls - Mathematically Aligned 48px Height */}
          <div className="flex flex-wrap items-center gap-3.5 font-mono text-xs">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-lg bg-[#00D6A3] hover:bg-[#00BF91] text-[#030609] font-bold text-[12px] transition-all duration-150 active:translate-y-[1px] shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_16px_rgba(0,214,163,0.18)] border border-[#00FFC2]/30 hover:border-[#00FFC2]/60"
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

        {/* RIGHT COLUMN: Large 3D Topographical Security Model with Dominant Mountain Peak (~61% width) */}
        <div className="w-full h-[540px] sm:h-[640px] lg:h-[760px] xl:h-[840px] relative flex items-center justify-center">
          <TopographicScene />
        </div>

      </div>
    </section>
  );
}

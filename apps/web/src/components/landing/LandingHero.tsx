"use client";

import React from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import TopographicScene from "./TopographicScene";
import TelemetryBackground from "./TelemetryBackground";

export default function LandingHero() {
  return (
    <section className="relative min-h-[820px] lg:h-[calc(100vh-56px)] xl:min-h-[860px] flex items-center pl-6 sm:pl-12 lg:pl-[clamp(48px,5vw,90px)] pr-4 sm:pr-8 lg:pr-12 pt-20 pb-12 overflow-hidden bg-[#05080B] text-[#F5F7FA]">
      {/* 1. Subtle Ambient Peripheral Telemetry Layer */}
      <TelemetryBackground />

      {/* 2. Strict 2-Column Hero Grid: 42% Left / 58% Right with Clear Separation */}
      <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[42%_58%] items-center gap-6 lg:gap-10 relative z-10">
        
        {/* LEFT COLUMN: Editorial Security Product Messaging (Max 650px Usable Space, Right Padding 40px) */}
        <div className="w-full max-w-[650px] lg:pr-10 flex flex-col items-start text-left z-20">
          
          {/* Institutional Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0F19] border border-white/[0.08] text-[11px] font-mono text-[#94A3B8] shadow-sm mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C98B] animate-pulse" />
            <span className="text-[#00D9FF] font-semibold tracking-wide">NTRO</span>
            <span className="text-white/20">•</span>
            <span className="text-[#00C98B] font-medium tracking-wide">DETERMINISTIC MULTI-VENDOR SECURITY</span>
          </div>

          {/* Controlled Editorial Headline (clamp: 58px-78px, Strictly 1-Line Spans at Desktop, Zero Collision) */}
          <h1 className="flex flex-col tracking-[-0.045em] font-sans font-extrabold text-[#F5F7FA] mb-6">
            <span className="block text-3xl sm:text-5xl lg:text-[54px] xl:text-[66px] 2xl:text-[76px] leading-[0.94] whitespace-nowrap">
              UNDERSTAND EVERY
            </span>
            <span className="block text-3xl sm:text-5xl lg:text-[54px] xl:text-[66px] 2xl:text-[76px] leading-[0.94] mt-1.5 sm:mt-2 whitespace-nowrap">
              CONFIGURATION.
            </span>
            <span className="block text-2xl sm:text-4xl lg:text-[44px] xl:text-[54px] 2xl:text-[64px] leading-[0.96] text-[#00D9FF] mt-4 sm:mt-5 whitespace-nowrap">
              TRUST EVERY DECISION.
            </span>
          </h1>

          {/* Supporting Architectural Copy (Max 600px Container) */}
          <p className="max-w-[600px] text-[15px] sm:text-[17px] xl:text-[18px] text-[#94A3B8] leading-[1.5] font-sans font-normal mb-8">
            NetVigil transforms Cisco IOS, Juniper JunOS, and Fortinet FortiOS configurations into
            one Universal Security Model, evaluates them against shared security frameworks, preserves
            line-level evidence, and uses grounded AI only where interpretation is required.
          </p>

          {/* Action Controls - Mathematically Aligned 48px Height */}
          <div className="flex flex-wrap items-center gap-3.5 font-mono text-xs">
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

        {/* RIGHT COLUMN: Large 3D Cybersecurity Intelligence Wireframe Terrain Visual (58% width) */}
        <div className="w-full h-[520px] sm:h-[620px] lg:h-[740px] xl:h-[820px] relative flex items-center justify-center">
          <TopographicScene />
        </div>

      </div>
    </section>
  );
}

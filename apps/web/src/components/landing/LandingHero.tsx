"use client";

import React from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import TopographicScene from "./TopographicScene";
import TelemetryBackground from "./TelemetryBackground";

export default function LandingHero() {
  return (
    <section className="relative min-h-[820px] lg:h-[860px] xl:h-[890px] flex items-center px-4 sm:px-8 lg:px-12 xl:px-16 pt-24 pb-14 overflow-hidden bg-[#050708] text-[#F5F7FA]">
      {/* 1. Subtle Ambient Peripheral Telemetry Layer */}
      <TelemetryBackground />

      {/* 2. Main 2-Column Hero Grid: 45% Left / 55% Right Independent Split */}
      <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[45%_55%] items-center gap-8 lg:gap-6 relative z-10">
        
        {/* LEFT COLUMN: Editorial Security Product Messaging (Max 720px Usable Space) */}
        <div className="w-full max-w-[720px] flex flex-col items-start text-left z-20">
          
          {/* Institutional Status Badge (30px margin bottom) */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0F19] border border-white/[0.08] text-[11px] font-mono text-[#94A3B8] shadow-sm mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C98B] animate-pulse" />
            <span className="text-[#00D9FF] font-semibold tracking-wide">NTRO</span>
            <span className="text-white/20">•</span>
            <span className="text-[#00C98B] font-medium tracking-wide">DETERMINISTIC MULTI-VENDOR SECURITY</span>
          </div>

          {/* Controlled Block-Level Editorial Headline (Zero-Collision Structure, 28px margin bottom) */}
          <h1 className="flex flex-col tracking-[-0.04em] font-sans font-extrabold text-[#F5F7FA] mb-7">
            <span className="block text-4xl sm:text-5xl lg:text-[60px] xl:text-[70px] leading-[1.02]">
              UNDERSTAND EVERY
            </span>
            <span className="block text-4xl sm:text-5xl lg:text-[60px] xl:text-[70px] leading-[1.02] mt-1 sm:mt-1.5">
              CONFIGURATION.
            </span>
            <span className="block text-3xl sm:text-4xl lg:text-[48px] xl:text-[58px] leading-[1.05] text-[#00D9FF] mt-5 sm:mt-6">
              TRUST EVERY DECISION.
            </span>
          </h1>

          {/* Supporting Architectural Copy (34px margin bottom) */}
          <p className="max-w-[620px] text-[16px] sm:text-[17px] text-[#94A3B8] leading-[1.6] font-sans font-normal mb-8">
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

        {/* RIGHT COLUMN: 3D Cybersecurity Wireframe Mountain Terrain Visual (~55% width) */}
        <div className="w-full h-[500px] sm:h-[600px] lg:h-[720px] xl:h-[780px] relative flex items-center justify-center">
          <TopographicScene />
        </div>

      </div>
    </section>
  );
}

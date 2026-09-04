"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import TopographicScene from "./TopographicScene";
import TelemetryBackground from "./TelemetryBackground";

export default function LandingHero() {
  const { user, loading: authLoading } = useAuth();
  const getStartedHref = !authLoading && user ? "/console" : "/login";

  return (
    <section className="relative min-h-[780px] lg:h-[calc(100vh-56px)] xl:min-h-[840px] flex items-center pl-6 sm:pl-10 lg:pl-16 pr-4 sm:pr-8 lg:pr-8 pt-14 pb-8 overflow-hidden bg-[#080808] text-[#F2F2F2]">
      {/* 1. Atmospheric Ambient Peripheral Telemetry */}
      <TelemetryBackground />

      {/* 2. Full-Bleed 3D Multi-Pyramid Topographical Security Scene Canvas */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden">
        <TopographicScene />
      </div>

      {/* 3. Left Content: Premium Editorial Security Messaging (Z-20, Max 520px) */}
      <div className="relative z-20 w-full max-w-[480px] lg:max-w-[520px] flex flex-col items-start text-left">

        {/* Institutional Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0B0B] border border-[#1F1F1F] text-[11px] font-mono text-[#8E8E93] shadow-sm mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
          <span className="text-[#3B82F6] font-semibold tracking-wide">NETVIGIL SECURITY</span>
          <span className="text-[#636366]">•</span>
          <span className="text-[#8E8E93] font-medium tracking-wide">DETERMINISTIC MULTI-VENDOR AUDITING</span>
        </div>

        {/* Scaled Editorial Headline (Bold & Clear) */}
        <h1 className="flex flex-col tracking-[-0.04em] font-sans font-extrabold text-[#F2F2F2] mb-5">
          <span className="block text-4xl sm:text-5xl lg:text-[46px] xl:text-[52px] 2xl:text-[56px] leading-[1.02] whitespace-nowrap">
            UNDERSTAND EVERY
          </span>
          <span className="block text-4xl sm:text-5xl lg:text-[46px] xl:text-[52px] 2xl:text-[56px] leading-[1.02] mt-1.5 whitespace-nowrap">
            CONFIGURATION.
          </span>
          <span className="block text-3xl sm:text-4xl lg:text-[38px] xl:text-[44px] 2xl:text-[48px] leading-[1.04] text-[#3B82F6] mt-3.5 whitespace-nowrap">
            TRUST EVERY DECISION.
          </span>
        </h1>

        {/* Supporting Architectural Copy */}
        <p className="max-w-[480px] text-[14.5px] sm:text-[15.5px] xl:text-[16.5px] text-[#8E8E93] leading-[1.6] font-sans font-normal mb-8">
          Turn network configurations into evidence-backed security decisions. NetVigil transforms Cisco IOS, Juniper JunOS, and Fortinet FortiOS configurations into one Universal Security Model, evaluates shared compliance frameworks, and delivers deterministic line-level proof.
        </p>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs mb-8">
          {/* Primary: Electric Blue Button */}
          <Link
            href={getStartedHref}
            id="hero-get-started-cta"
            className="group relative inline-flex items-center justify-center gap-2.5 px-6 h-11 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-[12px] tracking-wider rounded-lg transition-all duration-200 active:scale-[0.98] shadow-sm"
          >
            <span>GET STARTED →</span>
          </Link>

          {/* Secondary: Dark Surface Button */}
          <Link
            href="/demo/multi-vendor"
            id="hero-explore-engine-cta"
            className="inline-flex items-center justify-center gap-2 px-6 h-11 bg-[#0B0B0B] hover:bg-[#141414] border border-[#1F1F1F] hover:border-[#2C2C2E] text-[#F2F2F2] font-semibold text-[12px] tracking-wider rounded-lg transition-all duration-200 active:scale-[0.98]"
          >
            <span>EXPLORE SECURITY ENGINE →</span>
          </Link>
        </div>
      </div>

      {/* Floating Bottom-Left Corner Brand Node */}
      <div className="hidden lg:flex absolute bottom-4 left-6 sm:left-10 z-20 items-center justify-center w-8 h-8 rounded-full bg-[#0B0B0B] border border-[#1F1F1F] text-[#636366] text-[11px] font-mono">
        N
      </div>
    </section>
  );
}

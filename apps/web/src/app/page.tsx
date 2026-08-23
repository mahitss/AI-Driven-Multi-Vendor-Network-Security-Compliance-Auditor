"use client";

import React from "react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import HeterogeneousProblemSection from "@/components/landing/HeterogeneousProblemSection";
import PipelineFlowSection from "@/components/landing/PipelineFlowSection";
import AIBoundarySection from "@/components/landing/AIBoundarySection";
import ZeroExecutionSecuritySection from "@/components/landing/ZeroExecutionSecuritySection";
import LandingFooterCTA from "@/components/landing/LandingFooterCTA";

export default function NetVigilLandingPageV2() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] font-sans antialiased selection:bg-[#00D9FF]/20 selection:text-[#00D9FF]">
      {/* 1. Minimal Command Center Navbar */}
      <LandingNavbar />

      <main className="relative z-10">
        {/* 2. Full-Screen 3D Topographic Hero */}
        <LandingHero />

        {/* 3. The Heterogeneous Problem Section */}
        <HeterogeneousProblemSection />

        {/* 4. Deterministic Pipeline Flow */}
        <PipelineFlowSection />

        {/* 5. AI Invariant Boundary Section */}
        <AIBoundarySection />

        {/* 6. Defensive Safety & Zero Live Execution */}
        <ZeroExecutionSecuritySection />

        {/* 7. Executive Action CTA */}
        <LandingFooterCTA />
      </main>
    </div>
  );
}

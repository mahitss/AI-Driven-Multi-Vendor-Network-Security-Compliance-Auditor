"use client";

import React from "react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import MetricStripSection from "@/components/landing/MetricStripSection";
import ArchitectureLayersSection from "@/components/landing/ArchitectureLayersSection";
import AIBoundarySplitSection from "@/components/landing/AIBoundarySplitSection";
import SecurityInvariantsStrip from "@/components/landing/SecurityInvariantsStrip";
import MultiVendorProofSection from "@/components/landing/MultiVendorProofSection";
import GoldenDemoCalloutSection from "@/components/landing/GoldenDemoCalloutSection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function RootLandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#F3F4F6] font-sans antialiased selection:bg-[#3B82F6]/20 selection:text-[#3B82F6]">
      {/* 1. Technical Command Navbar */}
      <LandingNavbar />

      <main className="relative z-10">
        {/* 2. Full-Screen Interactive Topographic Hero */}
        <LandingHero />

        {/* 3. Verified Architectural Metric Strip */}
        <MetricStripSection />

        {/* 4. One Model. One Engine. Three Dialects. */}
        <ArchitectureLayersSection />

        {/* 5. Strict Deterministic Core vs Grounded AI Advisory Split */}
        <AIBoundarySplitSection />

        {/* 6. Five Defensive Security Invariants Strip */}
        <SecurityInvariantsStrip />

        {/* 7. Multi-Vendor Cross-OS Equivalence Proof */}
        <MultiVendorProofSection />

        {/* 8. Security Intelligence Showcase */}
        <GoldenDemoCalloutSection />
      </main>

      {/* 9. Minimal Technical Footer */}
      <LandingFooter />
    </div>
  );
}

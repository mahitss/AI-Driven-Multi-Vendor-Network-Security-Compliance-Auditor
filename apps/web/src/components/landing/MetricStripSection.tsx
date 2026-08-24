"use client";

import React from "react";

export default function MetricStripSection() {
  return (
    <section className="border-y border-white/[0.06] bg-[#050709] font-mono">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
          {/* Column 1: Security Engine */}
          <div className="pt-2 md:pt-0 md:px-6 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-[#64748B] uppercase tracking-[0.12em] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C896]" />
              <span>SECURITY ENGINE</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-[#F5F7FA] tracking-tight">
              NETVIGIL CORE
            </div>
            <div className="text-[11px] text-[#94A3B8]">Universal Compliance Runtime</div>
          </div>

          {/* Column 2: Native Vendors */}
          <div className="pt-4 md:pt-0 md:px-6 space-y-1.5">
            <div className="text-[10px] text-[#64748B] uppercase tracking-[0.12em] font-medium">
              NATIVE VENDORS
            </div>
            <div className="text-lg sm:text-xl font-bold text-[#00C896] tracking-tight">
              03
            </div>
            <div className="text-[11px] text-[#94A3B8]">CISCO · JUNIPER · FORTINET</div>
          </div>

          {/* Column 3: Security Frameworks */}
          <div className="pt-4 md:pt-0 md:px-6 space-y-1.5">
            <div className="text-[10px] text-[#64748B] uppercase tracking-[0.12em] font-medium">
              SECURITY FRAMEWORKS
            </div>
            <div className="text-lg sm:text-xl font-bold text-[#00D9FF] tracking-tight">
              04
            </div>
            <div className="text-[11px] text-[#94A3B8]">CIS · NIST · STIG · ISO</div>
          </div>

          {/* Column 4: AI Boundary */}
          <div className="pt-4 md:pt-0 md:px-6 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-[#64748B] uppercase tracking-[0.12em] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
              <span>AI BOUNDARY</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-[#F5F7FA] tracking-tight">
              ADVISORY ONLY
            </div>
            <div className="text-[11px] text-[#94A3B8]">Zero Verdict Modification</div>
          </div>
        </div>
      </div>
    </section>
  );
}

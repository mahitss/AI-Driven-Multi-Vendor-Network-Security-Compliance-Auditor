"use client";

import React from "react";

export default function MetricStripSection() {
  return (
    <section className="border-y border-white/5 bg-[#06080C] font-mono">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-white/5">
          <div className="pt-2 md:pt-0 md:px-6 space-y-1">
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-semibold">
              SYSTEM ID
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              SIH26155
            </div>
            <div className="text-[10px] text-[#A3A3A3]">NTRO Problem Statement</div>
          </div>

          <div className="pt-4 md:pt-0 md:px-6 space-y-1">
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-semibold">
              NATIVE VENDORS
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#10B981] tracking-tight">
              03
            </div>
            <div className="text-[10px] text-[#A3A3A3]">Cisco • Juniper • Fortinet</div>
          </div>

          <div className="pt-4 md:pt-0 md:px-6 space-y-1">
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-semibold">
              SECURITY FRAMEWORKS
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#06B6D4] tracking-tight">
              04
            </div>
            <div className="text-[10px] text-[#A3A3A3]">CIS • NIST • STIG • ISO</div>
          </div>

          <div className="pt-4 md:pt-0 md:px-6 space-y-1">
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-semibold">
              AI BOUNDARY
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              ADVISORY ONLY
            </div>
            <div className="text-[10px] text-[#A3A3A3]">Zero Verdict Modification</div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import { Lock, Activity } from "lucide-react";

export default function MetricStripSection() {
  return (
    <section className="border-t border-white/[0.08] bg-[#03070C] font-mono">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
          {/* Column 1: Security Engine */}
          <div className="pt-2 md:pt-0 md:px-6 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-[#00D9FF] uppercase tracking-[0.14em] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
              <span className="text-[#8B9EB3]">SECURITY ENGINE</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-[#FFFFFF] tracking-tight">
              NETVIGIL CORE
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#00E5AA] font-semibold">
              <span>ENGINE ONLINE</span>
              <Activity className="w-3 h-3 text-[#00E5AA]" />
            </div>
          </div>

          {/* Column 2: Native Vendors */}
          <div className="pt-4 md:pt-0 md:px-6 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-[#00D9FF] uppercase tracking-[0.14em] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
              <span className="text-[#8B9EB3]">NATIVE VENDORS</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#00D9FF] tracking-tight">
              03
            </div>
            <div className="text-[11px] text-[#8B9EB3]">CISCO • JUNIPER • FORTINET</div>
          </div>

          {/* Column 3: Security Frameworks */}
          <div className="pt-4 md:pt-0 md:px-6 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-[#00D9FF] uppercase tracking-[0.14em] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
              <span className="text-[#8B9EB3]">SECURITY FRAMEWORKS</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#00D9FF] tracking-tight">
              04
            </div>
            <div className="text-[11px] text-[#8B9EB3]">CIS • NIST • STIG • ISO</div>
          </div>

          {/* Column 4: AI Boundary */}
          <div className="pt-4 md:pt-0 md:px-6 space-y-1.5 relative flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-[#00D9FF] uppercase tracking-[0.14em] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
                <span className="text-[#8B9EB3]">AI BOUNDARY</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-[#FFFFFF] tracking-tight">
                ADVISORY ONLY
              </div>
              <div className="text-[11px] text-[#8B9EB3]">ZERO VERDICT MODIFICATION</div>
            </div>

            {/* Lock Icon Emblem */}
            <div className="w-8 h-8 rounded-full bg-[#0B132B]/90 border border-white/[0.08] flex items-center justify-center text-[#8B9EB3] mr-2">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

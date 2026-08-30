"use client";

import React from "react";
import { Lock, Activity } from "lucide-react";

export default function MetricStripSection() {
  return (
    <section className="border-t border-[#1D2939] bg-[#0A0F18] font-mono">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-[#1D2939]">
          {/* Column 1: Security Engine */}
          <div className="pt-2 md:pt-0 md:px-6 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-[#3B82F6] uppercase tracking-[0.14em] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
              <span className="text-[#667085]">SECURITY ENGINE</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-[#F3F4F6] tracking-tight">
              NETVIGIL CORE
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#10B981] font-semibold">
              <span>ENGINE ONLINE</span>
              <Activity className="w-3 h-3 text-[#10B981]" />
            </div>
          </div>

          {/* Column 2: Native Vendors */}
          <div className="pt-4 md:pt-0 md:px-6 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-[#3B82F6] uppercase tracking-[0.14em] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
              <span className="text-[#667085]">NATIVE VENDORS</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#F3F4F6] tracking-tight">
              03
            </div>
            <div className="text-[11px] text-[#A7B0C0]">CISCO • JUNIPER • FORTINET</div>
          </div>

          {/* Column 3: Security Frameworks */}
          <div className="pt-4 md:pt-0 md:px-6 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-[#3B82F6] uppercase tracking-[0.14em] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
              <span className="text-[#667085]">SECURITY FRAMEWORKS</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#F3F4F6] tracking-tight">
              04
            </div>
            <div className="text-[11px] text-[#A7B0C0]">CIS • NIST • STIG • ISO</div>
          </div>

          {/* Column 4: AI Boundary */}
          <div className="pt-4 md:pt-0 md:px-6 space-y-1.5 relative flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-[#3B82F6] uppercase tracking-[0.14em] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                <span className="text-[#667085]">AI BOUNDARY</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-[#F3F4F6] tracking-tight">
                ADVISORY ONLY
              </div>
              <div className="text-[11px] text-[#A7B0C0]">ZERO VERDICT MODIFICATION</div>
            </div>

            {/* Lock Icon Emblem */}
            <div className="w-8 h-8 rounded-full bg-[#111827] border border-[#1D2939] flex items-center justify-center text-[#A7B0C0] mr-2">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

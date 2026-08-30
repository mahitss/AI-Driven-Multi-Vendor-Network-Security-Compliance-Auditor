"use client";

import React from "react";
import { Shield } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="border-t border-[#1D2939] bg-[#080B12] py-12 px-4 sm:px-6 font-mono text-xs text-[#667085]">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-[#0D121C] border border-[#1D2939] flex items-center justify-center text-[#10B981]">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-[#F3F4F6] tracking-wider">NETVIGIL</span>
            <span className="text-[#3B82F6] ml-2">SECURITY OPERATIONS CENTER</span>
          </div>
        </div>

        <div className="text-center md:text-right space-y-1">
          <div className="text-[#F3F4F6] font-sans text-xs font-semibold">
            THREE DIALECTS. ONE SECURITY MODEL. ONE DETERMINISTIC VERDICT.
          </div>
          <div className="text-[10px]">
            AI-Driven Multi-Vendor Network Security Compliance Auditor • Zero Live Push Invariant
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#06080C] py-12 px-4 sm:px-6 font-mono text-xs text-[#737373]">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-[#0E131F] border border-white/10 flex items-center justify-center text-[#10B981]">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-white tracking-wider">NETVIGIL</span>
            <span className="text-[#06B6D4] ml-2">SIH26155 • NTRO</span>
          </div>
        </div>

        <div className="text-center md:text-right space-y-1">
          <div className="text-white font-sans text-xs font-semibold">
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

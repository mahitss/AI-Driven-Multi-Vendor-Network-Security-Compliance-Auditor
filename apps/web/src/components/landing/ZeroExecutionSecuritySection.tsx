"use client";

import React from "react";
import { ShieldCheck, Lock, Eye, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export default function ZeroExecutionSecuritySection() {
  return (
    <section id="security" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#141414] font-sans">
      <div className="space-y-3 text-center max-w-2xl mx-auto mb-16">
        <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#00D9FF]">
          DEFENSIVE ARCHITECTURE
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F5F5F5] tracking-tight">
          ZERO AUTOMATED NETWORK EXECUTION
        </h2>
        <p className="text-xs sm:text-sm text-[#8A8A8A]">
          In critical enterprise perimeters, automated network pushes risk bricking firewalls.
          NetVigil is strictly read-only and preview-driven.
        </p>
      </div>

      {/* Safety Execution Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-2">
          <div className="text-[11px] text-[#00D9FF] font-bold">01 • READ & HASH</div>
          <h3 className="text-xs font-bold text-[#F5F5F5]">Configuration Upload</h3>
          <p className="text-[11px] text-[#8A8A8A] font-sans">
            Cryptographic SHA-256 validation in isolated storage.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-2">
          <div className="text-[11px] text-[#8B5CF6] font-bold">02 • ANALYZE</div>
          <h3 className="text-xs font-bold text-[#F5F5F5]">Deterministic Audit</h3>
          <p className="text-[11px] text-[#8A8A8A] font-sans">
            Mathematical rule evaluation with exact line citations.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-2">
          <div className="text-[11px] text-[#F59E0B] font-bold">03 • PREVIEW</div>
          <h3 className="text-xs font-bold text-[#F5F5F5]">Allowlisted Diffs</h3>
          <p className="text-[11px] text-[#8A8A8A] font-sans">
            Static REMOVE / ADD diff synthesis from verified templates.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#22C55E]/40 space-y-2">
          <div className="text-[11px] text-[#22C55E] font-bold">04 • AUTHORIZE</div>
          <h3 className="text-xs font-bold text-[#F5F5F5]">Human Operator Review</h3>
          <p className="text-[11px] text-[#8A8A8A] font-sans">
            Manual sign-off and download for scheduled change windows.
          </p>
        </div>
      </div>

      {/* Safety Invariant Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 font-mono text-xs">
        <div className="p-4 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] flex items-center gap-3">
          <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
          <span className="text-[#D4D4D4]">No Automated SSH Push</span>
        </div>
        <div className="p-4 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] flex items-center gap-3">
          <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
          <span className="text-[#D4D4D4]">No Netconf Mutation Hooks</span>
        </div>
        <div className="p-4 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
          <span className="text-[#D4D4D4]">Air-Gap Offline Functional</span>
        </div>
      </div>
    </section>
  );
}

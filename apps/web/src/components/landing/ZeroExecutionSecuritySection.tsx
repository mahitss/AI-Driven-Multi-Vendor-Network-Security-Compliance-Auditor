"use client";

import React from "react";
import { ShieldCheck, Lock, Eye, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export default function ZeroExecutionSecuritySection() {
  return (
    <section id="security" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#1F1F1F] font-sans">
      <div className="space-y-3 text-center max-w-2xl mx-auto mb-16">
        <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#3B82F6]">
          DEFENSIVE ARCHITECTURE
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F2F2F2] tracking-tight">
          ZERO AUTOMATED NETWORK EXECUTION
        </h2>
        <p className="text-xs sm:text-sm text-[#8E8E93]">
          In critical enterprise perimeters, automated network pushes risk bricking firewalls.
          NetVigil is strictly read-only and preview-driven.
        </p>
      </div>

      {/* Safety Execution Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <div className="p-5 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-2">
          <div className="text-[11px] text-[#3B82F6] font-bold">01 • READ & HASH</div>
          <h3 className="text-xs font-bold text-[#F2F2F2]">Configuration Upload</h3>
          <p className="text-[11px] text-[#8E8E93] font-sans">
            Cryptographic SHA-256 validation in isolated storage.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-2">
          <div className="text-[11px] text-[#8B5CF6] font-bold">02 • ANALYZE</div>
          <h3 className="text-xs font-bold text-[#F2F2F2]">Deterministic Audit</h3>
          <p className="text-[11px] text-[#8E8E93] font-sans">
            Mathematical rule evaluation with exact line citations.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-2">
          <div className="text-[11px] text-[#F59E0B] font-bold">03 • PREVIEW</div>
          <h3 className="text-xs font-bold text-[#F2F2F2]">Allowlisted Diffs</h3>
          <p className="text-[11px] text-[#8E8E93] font-sans">
            Static REMOVE / ADD diff synthesis from verified templates.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#0B0B0B] border border-[#10B981]/40 space-y-2">
          <div className="text-[11px] text-[#10B981] font-bold">04 • AUTHORIZE</div>
          <h3 className="text-xs font-bold text-[#F2F2F2]">Human Operator Review</h3>
          <p className="text-[11px] text-[#8E8E93] font-sans">
            Manual sign-off and download for scheduled change windows.
          </p>
        </div>
      </div>

      {/* Safety Invariant Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 font-mono text-xs">
        <div className="p-4 rounded-lg bg-[#141414] border border-[#1F1F1F] flex items-center gap-3">
          <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
          <span className="text-[#8E8E93]">No Automated SSH Push</span>
        </div>
        <div className="p-4 rounded-lg bg-[#141414] border border-[#1F1F1F] flex items-center gap-3">
          <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
          <span className="text-[#8E8E93]">No Netconf Mutation Hooks</span>
        </div>
        <div className="p-4 rounded-lg bg-[#141414] border border-[#1F1F1F] flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span className="text-[#8E8E93]">Air-Gap Offline Functional</span>
        </div>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Terminal, CheckCircle2, ShieldAlert } from "lucide-react";

export default function MultiVendorProofSection() {
  return (
    <section id="multi-vendor" className="py-20 px-4 sm:px-6 max-w-[1440px] mx-auto space-y-10 font-sans">
      {/* Section Header */}
      <div className="text-center space-y-2 max-w-3xl mx-auto">
        <div className="text-xs font-mono text-[#06B6D4] font-semibold uppercase tracking-wider">
          CROSS-OS EQUIVALENCE PROOF
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          DIFFERENT DIALECTS. SAME SECURITY SEMANTICS.
        </h2>
        <p className="text-sm text-[#A3A3A3] font-mono">
          Heterogeneous syntax resolves to identical Universal Security Model slots.
        </p>
      </div>

      {/* Multi-Vendor Normalization Visual Proof Matrix */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0E131F]/90 border border-white/10 space-y-8 font-mono text-xs shadow-2xl">
        {/* Dialects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cisco IOS */}
          <div className="p-4 rounded-xl bg-[#07090E] border border-[#06B6D4]/30 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#06B6D4] font-bold">CISCO IOS</span>
              <span className="text-[#737373]">CLI Native</span>
            </div>
            <code className="text-sm text-white block bg-black/50 p-2.5 rounded border border-white/5">
              ip ssh version 1
            </code>
          </div>

          {/* Juniper JunOS */}
          <div className="p-4 rounded-xl bg-[#07090E] border border-[#10B981]/30 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#10B981] font-bold">JUNIPER JUNOS</span>
              <span className="text-[#737373]">Set Syntax</span>
            </div>
            <code className="text-xs sm:text-[11px] text-white block bg-black/50 p-2.5 rounded border border-white/5 break-all">
              set system services ssh protocol-version v1
            </code>
          </div>

          {/* Fortinet FortiOS */}
          <div className="p-4 rounded-xl bg-[#07090E] border border-[#F59E0B]/30 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#F59E0B] font-bold">FORTINET FORTIOS</span>
              <span className="text-[#737373]">Config System</span>
            </div>
            <code className="text-sm text-white block bg-black/50 p-2.5 rounded border border-white/5">
              set admin-ssh-v1 enable
            </code>
          </div>
        </div>

        {/* Convergence Flow Indicator */}
        <div className="flex items-center justify-center gap-3 text-xs text-[#06B6D4]">
          <span className="h-px bg-gradient-to-r from-transparent via-[#06B6D4]/50 to-transparent flex-1" />
          <span className="px-3 py-1 rounded-full bg-[#06B6D4]/10 border border-[#06B6D4]/30 font-bold uppercase tracking-wider text-[10px]">
            CONVERGES TO CANONICAL SECURITY MODEL
          </span>
          <span className="h-px bg-gradient-to-r from-transparent via-[#06B6D4]/50 to-transparent flex-1" />
        </div>

        {/* Normalized Model & Compliance Verdict */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#07090E] border border-[#10B981]/40 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-[#737373] uppercase">UNIVERSAL SECURITY MODEL SLOT</span>
              <div className="text-sm font-bold text-[#10B981]">
                remote_access.ssh_version = 1
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
          </div>

          <div className="p-4 rounded-xl bg-[#07090E] border border-[#EF4444]/40 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-[#737373] uppercase">DETERMINISTIC COMPLIANCE RULE</span>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>RULE-SSH-001</span>
                <span className="px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] text-xs font-bold border border-[#EF4444]/30">
                  FAIL
                </span>
              </div>
            </div>
            <ShieldAlert className="w-5 h-5 text-[#EF4444]" />
          </div>
        </div>

        {/* Action Link */}
        <div className="pt-2 text-center">
          <Link
            href="/demo/multi-vendor"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0E131F] border border-[#06B6D4]/30 hover:border-[#06B6D4] hover:bg-[#141B2D] text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
          >
            <span>OPEN MULTI-VENDOR PROOF →</span>
            <ArrowRight className="w-4 h-4 text-[#06B6D4]" />
          </Link>
        </div>
      </div>
    </section>
  );
}

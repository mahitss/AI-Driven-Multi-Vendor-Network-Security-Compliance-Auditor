"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Terminal, CheckCircle2, ShieldAlert } from "lucide-react";

export default function MultiVendorProofSection() {
  return (
    <section id="multi-vendor" className="py-20 px-4 sm:px-6 max-w-[1440px] mx-auto space-y-10 font-sans">
      {/* Section Header */}
      <div className="text-center space-y-2 max-w-3xl mx-auto">
        <div className="text-xs font-mono text-[#3B82F6] font-semibold uppercase tracking-wider">
          CROSS-OS EQUIVALENCE PROOF
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F2F2F2] tracking-tight">
          DIFFERENT DIALECTS. SAME SECURITY SEMANTICS.
        </h2>
        <p className="text-sm text-[#8E8E93] font-mono">
          Heterogeneous syntax resolves to identical Universal Security Model slots.
        </p>
      </div>

      {/* Multi-Vendor Normalization Visual Proof Matrix */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-8 font-mono text-xs shadow-2xl">
        {/* Dialects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cisco IOS */}
          <div className="p-4 rounded-xl bg-[#080808] border border-[#3B82F6]/30 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#3B82F6] font-bold">CISCO IOS</span>
              <span className="text-[#636366]">CLI Native</span>
            </div>
            <code className="text-sm text-[#F2F2F2] block bg-black/50 p-2.5 rounded border border-[#1F1F1F]">
              ip ssh version 1
            </code>
          </div>

          {/* Juniper JunOS */}
          <div className="p-4 rounded-xl bg-[#080808] border border-[#10B981]/30 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#10B981] font-bold">JUNIPER JUNOS</span>
              <span className="text-[#636366]">Set Syntax</span>
            </div>
            <code className="text-xs sm:text-[11px] text-[#F2F2F2] block bg-black/50 p-2.5 rounded border border-[#1F1F1F] break-all">
              set system services ssh protocol-version v1
            </code>
          </div>

          {/* Fortinet FortiOS */}
          <div className="p-4 rounded-xl bg-[#080808] border border-[#F59E0B]/30 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#F59E0B] font-bold">FORTINET FORTIOS</span>
              <span className="text-[#636366]">Config System</span>
            </div>
            <code className="text-sm text-[#F2F2F2] block bg-black/50 p-2.5 rounded border border-[#1F1F1F]">
              set admin-ssh-v1 enable
            </code>
          </div>
        </div>

        {/* Convergence Flow Indicator */}
        <div className="flex items-center justify-center gap-3 text-xs text-[#3B82F6]">
          <span className="h-px bg-gradient-to-r from-transparent via-[#3B82F6]/50 to-transparent flex-1" />
          <span className="px-3 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/30 font-bold uppercase tracking-wider text-[10px]">
            CONVERGES TO CANONICAL SECURITY MODEL
          </span>
          <span className="h-px bg-gradient-to-r from-transparent via-[#3B82F6]/50 to-transparent flex-1" />
        </div>

        {/* Normalized Model & Compliance Verdict */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#080808] border border-[#10B981]/40 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-[#636366] uppercase">UNIVERSAL SECURITY MODEL SLOT</span>
              <div className="text-sm font-bold text-[#10B981]">
                remote_access.ssh_version = 1
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
          </div>

          <div className="p-4 rounded-xl bg-[#080808] border border-[#EF4444]/40 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-[#636366] uppercase">DETERMINISTIC COMPLIANCE RULE</span>
              <div className="text-sm font-bold text-[#F2F2F2] flex items-center gap-2">
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#141414] border border-[#1F1F1F] hover:border-[#3B82F6] hover:bg-[#151E2D] text-[#F2F2F2] font-bold text-xs transition-all shadow-sm"
          >
            <span>OPEN MULTI-VENDOR PROOF →</span>
            <ArrowRight className="w-4 h-4 text-[#3B82F6]" />
          </Link>
        </div>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import { Server, ArrowRight, ShieldAlert, CheckCircle2, Layers } from "lucide-react";

export default function HeterogeneousProblemSection() {
  return (
    <section id="problem" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#141414] font-sans">
      <div className="space-y-4 text-center max-w-3xl mx-auto mb-16">
        <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#00D9FF]">
          THE CORE DILEMMA
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F5F5F5] tracking-tight">
          THE NETWORK IS HETEROGENEOUS. COMPLIANCE MUST BE DETERMINISTIC.
        </h2>
        <p className="text-xs sm:text-sm text-[#8A8A8A] leading-relaxed">
          Critical infrastructure perimeters combine disparate proprietary syntax models.
          Raw LLMs hallucinate non-existent controls, while manual spreadsheet audits take weeks.
        </p>
      </div>

      {/* Visual Convergence Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* Disparate Vendor Inputs */}
        <div className="space-y-3 font-mono">
          <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-[#F5F5F5]">
              <span className="text-[#00D9FF]">Cisco IOS-XE</span>
              <span className="text-[10px] text-[#8A8A8A]">Indented Blocks</span>
            </div>
            <div className="text-[11px] text-[#666666] font-mono truncate">
              line vty 0 4 / transport input telnet
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-[#F5F5F5]">
              <span className="text-[#8B5CF6]">Juniper JunOS</span>
              <span className="text-[10px] text-[#8A8A8A]">Hierarchical / Set</span>
            </div>
            <div className="text-[11px] text-[#666666] font-mono truncate">
              set system services ssh protocol-version v2
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-[#F5F5F5]">
              <span className="text-[#F59E0B]">Fortinet FortiOS</span>
              <span className="text-[10px] text-[#8A8A8A]">Edit / Stanzas</span>
            </div>
            <div className="text-[11px] text-[#666666] font-mono truncate">
              config system admin / set password ENC ...
            </div>
          </div>
        </div>

        {/* Normalization Engine (Center) */}
        <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#00D9FF]/30 text-center space-y-4 font-mono shadow-[0_0_30px_rgba(0,217,255,0.05)]">
          <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#00D9FF]/50 flex items-center justify-center text-[#00D9FF] mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F5F5F5] uppercase">
              Universal Security Normalizer
            </h3>
            <p className="text-[11px] text-[#8A8A8A] mt-1 font-sans">
              Extracts and maps proprietary syntax into 8 canonical security domains.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#141414] text-[10px] text-[#00D9FF]">
            <span>100% Deterministic AST Lexing</span>
          </div>
        </div>

        {/* Unified Security Baseline */}
        <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-3 font-mono">
          <div className="flex items-center gap-2 text-xs font-bold text-[#22C55E]">
            <CheckCircle2 className="w-4 h-4" />
            <span>ONE UNIFIED SECURITY BASELINE</span>
          </div>
          <p className="text-xs text-[#8A8A8A] font-sans leading-relaxed">
            Every vendor profile evaluates against identical catalog rules with exact source line citations:
          </p>
          <div className="space-y-1.5 text-[11px] text-[#A3A3A3]">
            <div className="p-2 rounded bg-[#0D0D0D] border border-[#171717] flex justify-between">
              <span>CIS Benchmarks v2.0</span>
              <span className="text-[#00D9FF]">15 Controls</span>
            </div>
            <div className="p-2 rounded bg-[#0D0D0D] border border-[#171717] flex justify-between">
              <span>NIST SP 800-53 r5</span>
              <span className="text-[#8B5CF6]">15 Controls</span>
            </div>
            <div className="p-2 rounded bg-[#0D0D0D] border border-[#171717] flex justify-between">
              <span>DISA STIG v2r1</span>
              <span className="text-[#F59E0B]">15 Controls</span>
            </div>
            <div className="p-2 rounded bg-[#0D0D0D] border border-[#171717] flex justify-between">
              <span>ISO/IEC 27001:2022</span>
              <span className="text-[#22C55E]">15 Controls</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

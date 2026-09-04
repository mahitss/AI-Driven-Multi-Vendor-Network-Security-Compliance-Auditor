"use client";

import React from "react";
import { Layers, Cpu, ShieldCheck, Check } from "lucide-react";

export default function ArchitectureLayersSection() {
  return (
    <section id="architecture" className="py-20 px-4 sm:px-6 max-w-[1440px] mx-auto space-y-12 font-sans">
      {/* Section Heading */}
      <div className="text-center space-y-2 max-w-3xl mx-auto">
        <div className="text-xs font-mono text-[#3B82F6] font-semibold uppercase tracking-wider">
          SYSTEM ARCHITECTURE
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F2F2F2] tracking-tight">
          ONE MODEL. ONE ENGINE. THREE DIALECTS.
        </h2>
        <p className="text-sm text-[#8E8E93] font-mono">
          Vendor syntax changes. Security semantics do not.
        </p>
      </div>

      {/* Three Architectural Layers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
        {/* Layer 01: Vendor AST Parsers */}
        <div className="p-6 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-4 flex flex-col justify-between hover:border-[#2C2C2E] transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#3B82F6] font-bold">LAYER 01</span>
              <Cpu className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <h3 className="text-base font-bold text-[#F2F2F2] font-sans">
              Vendor-Specific AST Parsers
            </h3>
            <p className="text-xs text-[#8E8E93] font-sans leading-relaxed">
              Native deterministic parsers convert proprietary network configuration syntax into structured security facts without LLM dependencies.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#1F1F1F] text-[11px]">
            <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F]">
              <span className="text-[#3B82F6] block text-[9px] font-bold">CISCO IOS</span>
              <code className="text-[#F2F2F2]">ip ssh version 1</code>
            </div>
            <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F]">
              <span className="text-[#10B981] block text-[9px] font-bold">JUNIPER JUNOS</span>
              <code className="text-[#F2F2F2]">set system services ssh protocol-version v1</code>
            </div>
            <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F]">
              <span className="text-[#F59E0B] block text-[9px] font-bold">FORTINET FORTIOS</span>
              <code className="text-[#F2F2F2]">set admin-ssh-v1 enable</code>
            </div>
          </div>
        </div>

        {/* Layer 02: Universal Security Model */}
        <div className="p-6 rounded-xl bg-[#141414] border border-[#3B82F6]/30 space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#10B981] font-bold">LAYER 02</span>
              <Layers className="w-4 h-4 text-[#10B981]" />
            </div>
            <h3 className="text-base font-bold text-[#F2F2F2] font-sans">
              Universal Security Model
            </h3>
            <p className="text-xs text-[#8E8E93] font-sans leading-relaxed">
              Vendor-specific syntax converges into canonical security properties across 8 standardized domains before compliance evaluation.
            </p>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-[#1F1F1F] text-[11px]">
            <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F] flex justify-between">
              <span className="text-[#8E8E93]">remote_access.ssh_version</span>
              <span className="text-[#EF4444] font-bold">1</span>
            </div>
            <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F] flex justify-between">
              <span className="text-[#8E8E93]">remote_access.telnet_enabled</span>
              <span className="text-[#EF4444] font-bold">true</span>
            </div>
            <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F] flex justify-between">
              <span className="text-[#8E8E93]">remote_access.http_server_enabled</span>
              <span className="text-[#EF4444] font-bold">true</span>
            </div>
            <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F] flex justify-between">
              <span className="text-[#8E8E93]">authentication.password_encryption</span>
              <span className="text-[#EF4444] font-bold">false</span>
            </div>
          </div>
        </div>

        {/* Layer 03: Deterministic Compliance Engine */}
        <div className="p-6 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-4 flex flex-col justify-between hover:border-[#2C2C2E] transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#10B981] font-bold">LAYER 03</span>
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            </div>
            <h3 className="text-base font-bold text-[#F2F2F2] font-sans">
              Shared Deterministic Compliance
            </h3>
            <p className="text-xs text-[#8E8E93] font-sans leading-relaxed">
              The exact same rule evaluation engine evaluates the normalized model regardless of originating dialect, guaranteeing mathematically reproducible verdicts.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#1F1F1F] text-[11px]">
            <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F] space-y-0.5">
              <div className="text-[9px] text-[#636366]">BENCHMARK</div>
              <div className="text-[#F2F2F2] font-bold">CIS v2.0</div>
            </div>
            <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F] space-y-0.5">
              <div className="text-[9px] text-[#636366]">FEDERAL</div>
              <div className="text-[#F2F2F2] font-bold">NIST 800-53</div>
            </div>
            <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F] space-y-0.5">
              <div className="text-[9px] text-[#636366]">DEFENSE</div>
              <div className="text-[#F2F2F2] font-bold">DISA STIG</div>
            </div>
            <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F] space-y-0.5">
              <div className="text-[9px] text-[#636366]">GLOBAL</div>
              <div className="text-[#F2F2F2] font-bold">ISO 27001</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

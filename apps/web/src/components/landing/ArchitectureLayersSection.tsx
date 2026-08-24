"use client";

import React from "react";
import { Layers, Cpu, ShieldCheck, Check } from "lucide-react";

export default function ArchitectureLayersSection() {
  return (
    <section id="architecture" className="py-20 px-4 sm:px-6 max-w-[1440px] mx-auto space-y-12 font-sans">
      {/* Section Heading */}
      <div className="text-center space-y-2 max-w-3xl mx-auto">
        <div className="text-xs font-mono text-[#06B6D4] font-semibold uppercase tracking-wider">
          SYSTEM ARCHITECTURE
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          ONE MODEL. ONE ENGINE. THREE DIALECTS.
        </h2>
        <p className="text-sm text-[#A3A3A3] font-mono">
          Vendor syntax changes. Security semantics do not.
        </p>
      </div>

      {/* Three Architectural Layers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
        {/* Layer 01: Vendor AST Parsers */}
        <div className="p-6 rounded-xl bg-[#0E131F]/60 border border-white/5 space-y-4 flex flex-col justify-between hover:border-white/15 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#06B6D4] font-bold">LAYER 01</span>
              <Cpu className="w-4 h-4 text-[#06B6D4]" />
            </div>
            <h3 className="text-base font-bold text-white font-sans">
              Vendor-Specific AST Parsers
            </h3>
            <p className="text-xs text-[#A3A3A3] font-sans leading-relaxed">
              Native deterministic parsers convert proprietary network configuration syntax into structured security facts without LLM dependencies.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-white/5 text-[11px]">
            <div className="p-2 rounded bg-[#07090E] border border-white/5">
              <span className="text-[#06B6D4] block text-[9px] font-bold">CISCO IOS</span>
              <code className="text-white">ip ssh version 1</code>
            </div>
            <div className="p-2 rounded bg-[#07090E] border border-white/5">
              <span className="text-[#10B981] block text-[9px] font-bold">JUNIPER JUNOS</span>
              <code className="text-white">set system services ssh protocol-version v1</code>
            </div>
            <div className="p-2 rounded bg-[#07090E] border border-white/5">
              <span className="text-[#F59E0B] block text-[9px] font-bold">FORTINET FORTIOS</span>
              <code className="text-white">set admin-ssh-v1 enable</code>
            </div>
          </div>
        </div>

        {/* Layer 02: Universal Security Model */}
        <div className="p-6 rounded-xl bg-[#0E131F]/80 border border-[#06B6D4]/30 space-y-4 flex flex-col justify-between shadow-[0_0_20px_rgba(6,182,212,0.08)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#10B981] font-bold">LAYER 02</span>
              <Layers className="w-4 h-4 text-[#10B981]" />
            </div>
            <h3 className="text-base font-bold text-white font-sans">
              Universal Security Model
            </h3>
            <p className="text-xs text-[#A3A3A3] font-sans leading-relaxed">
              Vendor-specific syntax converges into canonical security properties across 8 standardized domains before compliance evaluation.
            </p>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-white/5 text-[11px]">
            <div className="p-2 rounded bg-[#07090E] border border-white/5 flex justify-between">
              <span className="text-[#A3A3A3]">remote_access.ssh_version</span>
              <span className="text-[#EF4444] font-bold">1</span>
            </div>
            <div className="p-2 rounded bg-[#07090E] border border-white/5 flex justify-between">
              <span className="text-[#A3A3A3]">remote_access.telnet_enabled</span>
              <span className="text-[#EF4444] font-bold">true</span>
            </div>
            <div className="p-2 rounded bg-[#07090E] border border-white/5 flex justify-between">
              <span className="text-[#A3A3A3]">remote_access.http_server_enabled</span>
              <span className="text-[#EF4444] font-bold">true</span>
            </div>
            <div className="p-2 rounded bg-[#07090E] border border-white/5 flex justify-between">
              <span className="text-[#A3A3A3]">authentication.password_encryption</span>
              <span className="text-[#EF4444] font-bold">false</span>
            </div>
          </div>
        </div>

        {/* Layer 03: Deterministic Compliance Engine */}
        <div className="p-6 rounded-xl bg-[#0E131F]/60 border border-white/5 space-y-4 flex flex-col justify-between hover:border-white/15 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#10B981] font-bold">LAYER 03</span>
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            </div>
            <h3 className="text-base font-bold text-white font-sans">
              Shared Deterministic Compliance
            </h3>
            <p className="text-xs text-[#A3A3A3] font-sans leading-relaxed">
              The exact same rule evaluation engine evaluates the normalized model regardless of originating dialect, guaranteeing mathematically reproducible verdicts.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 text-[11px]">
            <div className="p-2.5 rounded bg-[#07090E] border border-white/5 space-y-0.5">
              <div className="text-[9px] text-[#737373]">BENCHMARK</div>
              <div className="text-white font-bold">CIS v2.0</div>
            </div>
            <div className="p-2.5 rounded bg-[#07090E] border border-white/5 space-y-0.5">
              <div className="text-[9px] text-[#737373]">FEDERAL</div>
              <div className="text-white font-bold">NIST 800-53</div>
            </div>
            <div className="p-2.5 rounded bg-[#07090E] border border-white/5 space-y-0.5">
              <div className="text-[9px] text-[#737373]">DEFENSE</div>
              <div className="text-white font-bold">DISA STIG</div>
            </div>
            <div className="p-2.5 rounded bg-[#07090E] border border-white/5 space-y-0.5">
              <div className="text-[9px] text-[#737373]">GLOBAL</div>
              <div className="text-white font-bold">ISO 27001</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import { ShieldCheck, Sparkles, AlertTriangle, Terminal, CheckCircle2 } from "lucide-react";

export default function AIBoundarySplitSection() {
  return (
    <section id="ai-boundary" className="py-20 px-4 sm:px-6 max-w-[1440px] mx-auto space-y-12 font-sans">
      {/* Section Header */}
      <div className="text-center space-y-2 max-w-3xl mx-auto">
        <div className="text-xs font-mono text-[#10B981] font-semibold uppercase tracking-wider">
          GOVERNANCE & SAFETY INVARIANT
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F2F2F2] tracking-tight">
          STRICT DETERMINISTIC & AI BOUNDARY
        </h2>
        <p className="text-sm text-[#8E8E93] font-mono">
          Deterministic logic decides compliance. AI interprets context.
        </p>
      </div>

      {/* 50/50 Split Viewport Module */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
        {/* Left Column: Deterministic Verdict (Emerald) */}
        <div className="p-6 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2C2C2E] transition-colors space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F1F]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span className="text-xs font-bold text-[#F2F2F2] uppercase tracking-wider">
                DETERMINISTIC VERDICT
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] font-bold text-[10px] border border-[#10B981]/30">
              IMMUTABLE
            </span>
          </div>

          <p className="text-xs text-[#8E8E93] font-sans leading-relaxed">
            Security findings, compliance scores, severity, and risk classification are computed purely through deterministic rule logic without generative hallucination.
          </p>

          <div className="p-4 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#636366]">CONTROL ID</span>
                <div className="text-sm font-bold text-[#F2F2F2]">CIS-1.2.1 (SSH Version)</div>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#EF4444]/10 text-[#EF4444] font-bold text-xs border border-[#EF4444]/30">
                FAIL
              </span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="text-[10px] text-[#636366]">LINE-LEVEL EVIDENCE</div>
              <div className="p-2 rounded bg-black/40 border border-[#EF4444]/20 text-[#EF4444] font-mono flex items-center justify-between">
                <span>[Line 17] ip ssh version 1</span>
                <span className="text-[10px] text-[#636366]">Expected: 2</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-4 text-[10px] text-[#10B981]">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Exact Line Citations
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Zero LLM Verdict Influence
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Grounded AI Advisory */}
        <div className="p-6 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2C2C2E] transition-colors space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F1F]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4D4D8]" />
              <span className="text-xs font-bold text-[#F2F2F2] uppercase tracking-wider">
                GROUNDED AI ADVISORY
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#1A1A1A] text-[#D4D4D8] font-bold text-[10px] border border-[#2E2E2E]">
              AI ≠ VERDICT
            </span>
          </div>

          <p className="text-xs text-[#8E8E93] font-sans leading-relaxed">
            AI explains findings in plain language, calculates blast radius, and suggests remediation. The model operates under strict read-only constraints.
          </p>

          <div className="p-4 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#D4D4D8] font-bold">WHY THIS MATTERS</span>
              <span className="text-[#636366]">READ ONLY • EVIDENCE GROUNDED</span>
            </div>

            <p className="text-[11px] text-[#8E8E93] font-sans leading-relaxed bg-black/40 p-2.5 rounded border border-[#1F1F1F]">
              "SSH Version 1 utilizes vulnerable CRC-32 compensation attacks and weak session key exchanges. An adversary intercepting traffic on the management network segment can decrypt credentials in transit."
            </p>

            <div className="pt-2 flex items-center gap-4 text-[10px] text-[#D4D4D8]">
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3" /> Remediation Template Assist
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-[#F59E0B]" /> Cannot Flip Pass/Fail
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

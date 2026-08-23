"use client";

import React from "react";
import { ShieldCheck, Bot, Check, X, Lock } from "lucide-react";

export default function AIBoundarySection() {
  return (
    <section id="ai-boundary" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#141414] font-sans">
      {/* Central Axiom Banner */}
      <div className="p-8 sm:p-12 rounded-2xl bg-[#080808] border border-[#1A1A1A] text-center space-y-4 mb-16 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] border border-[#222222] text-[11px] font-mono text-[#00D9FF]">
          <Lock className="w-3.5 h-3.5" />
          <span>STRICT ARCHITECTURAL INVARIANT</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F5F5F5] tracking-tight font-sans">
          AI INTERPRETS. <span className="text-[#00D9FF]">RULES DECIDE.</span> HUMANS CONTROL.
        </h2>
        <p className="text-xs sm:text-sm text-[#8A8A8A] max-w-2xl mx-auto leading-relaxed">
          National technical compliance requires 100% mathematical reproducibility. NetVigil strictly isolates the AI advisory layer from the compliance decision authority.
        </p>
      </div>

      {/* Comparative Column Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
        {/* Deterministic Compliance Core */}
        <div className="p-6 sm:p-8 rounded-xl bg-[#0A0A0A] border border-[#22C55E]/30 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/40 flex items-center justify-center text-[#22C55E]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5] uppercase">
                Deterministic Compliance Core
              </h3>
              <span className="text-[10px] text-[#22C55E]">Sole Authority on Results</span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-[#A3A3A3] font-sans">
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
              <span>Decides 100% of PASS / FAIL audit verdicts</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
              <span>Calculates mathematical compliance percentages</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
              <span>Preserves exact verbatim configuration line numbers</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
              <span>Computes P0-P3 topological risk priority scores</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
              <span>Synthesizes allowlisted vendor CLI diffs</span>
            </div>
          </div>
        </div>

        {/* AI Advisory Gateway */}
        <div className="p-6 sm:p-8 rounded-xl bg-[#0A0A0A] border border-[#8B5CF6]/30 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5] uppercase">
                OpenRouter AI Advisory Layer
              </h3>
              <span className="text-[10px] text-[#8B5CF6]">Advisory & Interpretation Only</span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-[#A3A3A3] font-sans">
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
              <span>Classifies unknown vendor directives into candidate properties</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
              <span>Explains failed security findings using grounded line evidence</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
              <span>Assists operators with natural-language audit co-pilot Q&A</span>
            </div>
            <div className="flex items-start gap-2.5 text-[#EF4444]">
              <X className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <span>Cannot alter PASS/FAIL, scores, severities, or push fixes</span>
            </div>
            <div className="flex items-start gap-2.5 text-[#8A8A8A]">
              <Check className="w-4 h-4 text-[#8A8A8A] shrink-0 mt-0.5" />
              <span>Gracefully falls back to Offline Standby if provider is unavailable</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

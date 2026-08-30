"use client";

import React from "react";
import { ShieldCheck, Bot, Check, X, Lock } from "lucide-react";

export default function AIBoundarySection() {
  return (
    <section id="ai-boundary" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#1D2939] font-sans">
      {/* Central Axiom Banner */}
      <div className="p-8 sm:p-12 rounded-2xl bg-[#0D121C] border border-[#1D2939] text-center space-y-4 mb-16 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111827] border border-[#1D2939] text-[11px] font-mono text-[#3B82F6]">
          <Lock className="w-3.5 h-3.5" />
          <span>STRICT ARCHITECTURAL INVARIANT</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F3F4F6] tracking-tight font-sans">
          AI INTERPRETS. <span className="text-[#3B82F6]">RULES DECIDE.</span> HUMANS CONTROL.
        </h2>
        <p className="text-xs sm:text-sm text-[#A7B0C0] max-w-2xl mx-auto leading-relaxed">
          National technical compliance requires 100% mathematical reproducibility. NetVigil strictly isolates the AI advisory layer from the compliance decision authority.
        </p>
      </div>

      {/* Comparative Column Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
        {/* Deterministic Compliance Core */}
        <div className="p-6 sm:p-8 rounded-xl bg-[#0D121C] border border-[#10B981]/30 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F3F4F6] uppercase">
                Deterministic Compliance Core
              </h3>
              <span className="text-[10px] text-[#10B981]">Sole Authority on Results</span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-[#A7B0C0] font-sans">
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span>Decides 100% of PASS / FAIL audit verdicts</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span>Calculates mathematical compliance percentages</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span>Preserves exact verbatim configuration line numbers</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span>Computes P0-P3 topological risk priority scores</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span>Synthesizes allowlisted vendor CLI diffs</span>
            </div>
          </div>
        </div>

        {/* AI Advisory Gateway */}
        <div className="p-6 sm:p-8 rounded-xl bg-[#0D121C] border border-[#8B5CF6]/30 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F3F4F6] uppercase">
                OpenRouter AI Advisory Layer
              </h3>
              <span className="text-[10px] text-[#8B5CF6]">Advisory & Interpretation Only</span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-[#A7B0C0] font-sans">
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
            <div className="flex items-start gap-2.5 text-[#667085]">
              <Check className="w-4 h-4 text-[#667085] shrink-0 mt-0.5" />
              <span>Gracefully falls back to Offline Standby if provider is unavailable</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

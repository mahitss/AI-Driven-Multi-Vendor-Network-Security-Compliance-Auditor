"use client";

import React, { useState } from "react";
import { Bot, Sparkles, Send, ShieldAlert, Cpu } from "lucide-react";

export default function AIAssistantPage() {
  const [input, setInput] = useState("");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Bot className="w-5 h-5 text-cyan-400" />
          <span>Auditor AI Co-pilot</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Assisted explanation generator and vendor remediation synthesizer with strict deterministic guardrails.
        </p>
      </div>

      {/* Deterministic Guardrail Banner */}
      <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-cyan-200">Deterministic Engine Boundary</div>
          <p className="text-slate-400 leading-relaxed">
            All compliance determinations, severity ratings, and proof evidence are strictly governed by NetVigil's
            deterministic AST parser and rule evaluator. The AI Co-pilot assists with semantic translation of obscure syntax
            and remediation guidance without overriding deterministic audit decisions.
          </p>
        </div>
      </div>

      {/* Assistant Shell Interface */}
      <div className="p-6 rounded-xl bg-slate-900/50 border border-white/5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/5 text-xs text-slate-400 font-mono">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Provider: OpenRouter Compatible Abstraction (Claude 3.5 Sonnet / Air-Gapped Fallback)</span>
        </div>

        <div className="space-y-3 py-6 text-center text-slate-500 text-xs">
          <Sparkles className="w-8 h-8 mx-auto text-cyan-400/50" />
          <p className="max-w-md mx-auto">
            Select a compliance finding or upload an unparsed CLI excerpt to trigger AI-assisted explanation and remediation
            synthesis.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the auditor co-pilot about Cisco, Juniper, or Fortinet security hardening..."
            className="flex-1 px-3 py-2 rounded-lg bg-[#070b12] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
          />
          <button className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors">
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

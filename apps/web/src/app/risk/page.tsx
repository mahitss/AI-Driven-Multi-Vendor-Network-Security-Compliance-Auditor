"use client";

import React from "react";
import { Flame, ShieldAlert, Network, ArrowRight } from "lucide-react";

export default function RiskIntelligencePage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Flame className="w-5 h-5 text-amber-400" />
          <span>Risk Intelligence & Attack Surface Analysis</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Severity aggregation, blast radius quantification, and network topology exposure risk.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-1">
          <div className="text-xs text-slate-400 font-mono">Posture Score</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">100%</div>
          <div className="text-[11px] text-slate-500">Baseline established</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-1">
          <div className="text-xs text-slate-400 font-mono">Critical Attack Paths</div>
          <div className="text-2xl font-bold text-slate-300 font-mono">0</div>
          <div className="text-[11px] text-slate-500">No active path breaches</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-1">
          <div className="text-xs text-slate-400 font-mono">Remediation Velocity</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">--</div>
          <div className="text-[11px] text-slate-500">Awaiting audit runs</div>
        </div>
      </div>
    </div>
  );
}

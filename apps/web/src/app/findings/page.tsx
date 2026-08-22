"use client";

import React from "react";
import { AlertTriangle, Filter, CheckCircle2 } from "lucide-react";

export default function FindingsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <span>Evidence-Based Findings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographically referenced configuration lines and deterministic violation proof.
        </p>
      </div>

      <div className="p-8 rounded-xl bg-slate-900/40 border border-white/5 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-white">No Unresolved Audit Findings</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Audit runs generate granular findings with verbatim line-by-line evidence and vendor-specific remediation
          commands.
        </p>
      </div>
    </div>
  );
}

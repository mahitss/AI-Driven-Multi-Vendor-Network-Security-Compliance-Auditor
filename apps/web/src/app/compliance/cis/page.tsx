"use client";

import React from "react";
import { Layers, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

export default function CISCompliancePage() {
  const benchmarks = [
    { name: "CIS Cisco IOS 15 Benchmark", version: "v4.1.0", sections: 8, rules: 64, status: "Engine Ready" },
    { name: "CIS Cisco IOS-XE 17 Benchmark", version: "v2.0.0", sections: 9, rules: 72, status: "Engine Ready" },
    { name: "CIS Juniper JunOS Benchmark", version: "v1.2.0", sections: 6, rules: 48, status: "Engine Ready" },
    { name: "CIS Fortinet FortiOS 7.x Benchmark", version: "v1.1.0", sections: 7, rules: 55, status: "Engine Ready" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span>CIS Benchmarks Compliance Engine</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Center for Internet Security (CIS) hardened configuration baselines evaluated via Universal Security Normalization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {benchmarks.map((bm) => (
          <div key={bm.name} className="p-5 rounded-xl bg-slate-900/50 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{bm.name}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                {bm.version}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <span>{bm.sections} Baseline Sections</span>
              <span>•</span>
              <span>{bm.rules} Controls Mapped</span>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-500">Universal Normalizer Status</span>
              <span className="text-emerald-400 font-mono font-medium">{bm.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

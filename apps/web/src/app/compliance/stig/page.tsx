"use client";

import React from "react";
import { Layers, ShieldAlert } from "lucide-react";

export default function STIGCompliancePage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-amber-400" />
          <span>DISA STIG Security Technical Implementation Guides</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Department of Defense (DoD) hardening benchmarks categorized into Severity CAT I, CAT II, and CAT III.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/50 border border-rose-800/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-rose-300">CAT I (High)</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/50">
              Immediate Vulnerability
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Enforces removal of unencrypted Telnet, default passwords, and insecure management services.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/50 border border-amber-800/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-300">CAT II (Medium)</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/50">
              Degraded Posture
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Enforces centralized AAA accounting, VTY access classes, and NTP authenticated time synchronization.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/50 border border-cyan-800/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-cyan-300">CAT III (Low)</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
              Administrative Hygiene
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Enforces legal MOTD login warning banners and interface descriptions.
          </p>
        </div>
      </div>
    </div>
  );
}

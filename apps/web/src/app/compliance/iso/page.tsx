"use client";

import React from "react";
import { Layers } from "lucide-react";

export default function ISOCompliancePage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-emerald-400" />
          <span>ISO/IEC 27001:2022 Network Controls</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Information security management system mappings for network infrastructure and access segregation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-1.5">
          <div className="text-xs font-mono font-bold text-emerald-400">Control A.8.20</div>
          <div className="text-sm font-semibold text-white">Network Security Controls</div>
          <p className="text-xs text-slate-400">
            Network devices must be configured with boundary filtering, secure protocols, and authenticated access.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-1.5">
          <div className="text-xs font-mono font-bold text-emerald-400">Control A.8.21</div>
          <div className="text-sm font-semibold text-white">Security of Network Services</div>
          <p className="text-xs text-slate-400">
            Enforces strict service-level segregation and disables insecure cleartext management daemons.
          </p>
        </div>
      </div>
    </div>
  );
}

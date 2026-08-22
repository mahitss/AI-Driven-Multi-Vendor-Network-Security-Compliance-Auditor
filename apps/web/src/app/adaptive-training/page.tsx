"use client";

import React from "react";
import { Sparkles, CheckCircle2, Cpu, GitBranch } from "lucide-react";

export default function AdaptiveTrainingPage() {
  const mappings = [
    {
      vendor: "cisco",
      pattern: "service password-encryption",
      control: "authentication.password_encryption_enabled",
      verified: true,
      confidence: 1.0,
    },
    {
      vendor: "juniper",
      pattern: "services { ssh { protocol-version v2; } }",
      control: "remote_access.ssh_version",
      verified: true,
      confidence: 1.0,
    },
    {
      vendor: "fortinet",
      pattern: "config system global -> set admintimeout (\d+)",
      control: "remote_access.inactivity_timeout_minutes",
      verified: true,
      confidence: 0.98,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span>Adaptive Training & Syntax Normalization</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Human-in-the-loop registry for mapping vendor-specific syntax to the Universal Security Schema.
        </p>
      </div>

      <div className="p-5 rounded-xl bg-slate-900/50 border border-white/5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <span className="text-xs font-mono font-semibold text-slate-200">Active Canonical Mappings</span>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/40">
            {mappings.length} Baseline Rules
          </span>
        </div>

        <div className="space-y-2">
          {mappings.map((m, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-[#0b101c] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase text-[10px]">
                    {m.vendor}
                  </span>
                  <span className="text-cyan-300">{m.pattern}</span>
                </div>
                <div className="text-[11px] text-slate-400">Maps to: {m.control}</div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto text-[11px]">
                <span className="text-slate-400">Confidence: {(m.confidence * 100).toFixed(0)}%</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

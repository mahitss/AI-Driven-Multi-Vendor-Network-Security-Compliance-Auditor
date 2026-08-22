"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Plus, Clock, FileCode2, CheckCircle2, AlertTriangle, Play } from "lucide-react";

export default function AuditsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>Compliance Audits</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic security baseline audit execution sessions and score histories.
          </p>
        </div>

        <Link
          href="/configurations"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Play className="w-3.5 h-3.5" />
          <span>New Audit Run</span>
        </Link>
      </div>

      {/* Empty State / Operational Flow */}
      <div className="p-8 rounded-xl bg-slate-900/40 border border-white/5 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-white">No Active Audit Runs</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Audits evaluate ingested network configurations against CIS, NIST, DISA STIG, and ISO 27001 deterministic rule
          engines.
        </p>
        <div className="pt-2">
          <Link
            href="/configurations"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
          >
            <FileCode2 className="w-4 h-4 text-cyan-400" />
            <span>Select Configuration to Audit</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

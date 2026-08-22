"use client";

import React from "react";
import { FileText, Download, ShieldCheck, CheckCircle } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-emerald-400" />
          <span>Executive & Technical Compliance Reports</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Generate formal PDF / JSON compliance audit certifications with executive summaries and line-by-line evidence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/50 border border-white/5 space-y-3">
          <div className="text-sm font-semibold text-white">Executive Compliance Summary</div>
          <p className="text-xs text-slate-400">
            High-level posture rating, framework compliance breakdown, and top risk items tailored for leadership review.
          </p>
          <button className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-2 transition-colors">
            <Download className="w-3.5 h-3.5" />
            <span>Generate Executive PDF</span>
          </button>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/50 border border-white/5 space-y-3">
          <div className="text-sm font-semibold text-white">Technical Evidence Audit Log</div>
          <p className="text-xs text-slate-400">
            Verbatim configuration excerpts, cryptographic digests, expected vs actual values, and vendor CLI remediation
            scripts.
          </p>
          <button className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-2 transition-colors">
            <Download className="w-3.5 h-3.5" />
            <span>Export Technical Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}
